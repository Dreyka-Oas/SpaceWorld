import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import si from 'systeminformation';
import { exec, spawn } from 'child_process';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'public')));

const JWT_SECRET = "SPACE_KEY_SECRET_999";

let defaultInterface = '*'; 
si.networkInterfaceDefault().then(i => defaultInterface = i).catch(console.error);

// --- FONCTIONS AUTHENTIFICATION ---

// Méthode 1 : Lecture du fichier Shadow (Rapide)
const checkShadow = (username, password) => {
    return new Promise((resolve) => {
        try {
            const shadow = fs.readFileSync('/etc/shadow', 'utf8');
            const line = shadow.split('\n').find(l => l.startsWith(`${username}:`));
            if(!line) return resolve(false);
            
            const hash = line.split(':')[1];
            if(hash.length < 5 || hash === '*' || hash === '!') return resolve(false);

            const py = spawn('python3', ['-c', `
import crypt, sys
p = sys.stdin.read()
h = sys.argv[1]
try:
    print("OK" if crypt.crypt(p, h) == h else "NO", end="")
except:
    print("ERR", end="")
            `, hash]);

            let res = '';
            py.stdout.on('data', d => res += d.toString());
            py.stdin.write(password);
            py.stdin.end();
            py.on('close', () => resolve(res === 'OK'));
        } catch(e) { resolve(false); }
    });
};

// Méthode 2 : Test Sudo (Fallback)
const checkSudoAuth = (username, password) => {
    return new Promise((resolve) => {
        const safePass = password.replace(/'/g, "'\\''");
        const cmd = `su - ${username} -c "echo '${safePass}' | sudo -S -v -k"`;
        exec(cmd, (error) => resolve(!error));
    });
};

const getSystemUsers = async () => {
    try {
        const passwd = fs.readFileSync('/etc/passwd', 'utf8').split('\n');
        const groups = fs.readFileSync('/etc/group', 'utf8').split('\n');
        let admins = ['root'];
        groups.forEach(g => {
            if(g.startsWith('sudo:') || g.startsWith('wheel:')) {
                const p = g.split(':');
                if(p[3]) admins.push(...p[3].split(','));
            }
        });
        const users = [];
        passwd.forEach(l => {
            const p = l.split(':');
            if(p.length > 2) {
                const uid = parseInt(p[2]);
                if((uid >= 1000 && uid < 60000) || uid === 0) {
                    users.push({ user: p[0], uid, shell: p[6], role: admins.includes(p[0]) ? (uid===0?'ROOT':'ADMIN') : 'USER' });
                }
            }
        });
        return users;
    } catch(e) { return []; }
};

// --- SOCKET ---
io.on('connection', (socket) => {

    socket.on('login', async ({ username, password }) => {
        const u = username.replace(/[^a-z0-9_-]/gi, '');
        
        // ⛔ SECURITE : INTERDIRE ROOT
        if (u === 'root') {
            socket.emit('loginError', "Connexion en tant que Root désactivée.");
            return;
        }

        console.log(`Tentative de connexion pour : ${u}`);

        // 1. Essai via Shadow
        let valid = await checkShadow(u, password);
        
        // 2. Si échec, essai via Sudo (Fallback)
        if (!valid) {
            console.log("Shadow échoué, tentative méthode Sudo...");
            valid = await checkSudoAuth(u, password);
        }

        if (valid) {
            console.log(">> Connexion réussie !");
            exec(`groups ${u}`, (err, stdout) => {
                const isSudo = stdout.includes('sudo') || stdout.includes('wheel');
                const token = jwt.sign({ user: u, role: isSudo ? 'admin' : 'user' }, JWT_SECRET, { expiresIn: '4h' });
                socket.emit('loginSuccess', { token, username: u, isAdmin: isSudo });
            });
        } else {
            console.log(">> Échec mot de passe.");
            socket.emit('loginError', "Identifiants incorrects.");
        }
    });

    socket.on('joinMonitor', (token) => {
        try {
            const d = jwt.verify(token, JWT_SECRET);
            if(d) {
                socket.join('admin_room');
                Promise.all([si.cpu(), si.osInfo(), si.mem()]).then(([c, o, m]) => {
                    socket.emit('staticData', {
                        cpuName: `${c.manufacturer} ${c.brand}`,
                        osName: `${o.distro} ${o.release}`,
                        totalRam: (m.total/1073741824).toFixed(1),
                        totalSwap: (m.swaptotal/1073741824).toFixed(1)
                    });
                });
                if(d.role === 'admin') getSystemUsers().then(u => socket.emit('usersList', u));
            }
        } catch (e) { socket.emit('forceLogout'); }
    });

    // ADMIN ACTIONS
    socket.on('createUser', ({ token, newUser, newPass, isAdmin }) => {
        try {
            if(jwt.verify(token, JWT_SECRET).role !== 'admin') return;
            const u=newUser.replace(/[^a-z0-9_-]/gi,''); const p=newPass.replace(/'/g,"'\\''");
            let c = `useradd -m -s /bin/bash ${u} && echo "${u}:${p}" | chpasswd`;
            if(isAdmin) c+=` && usermod -aG sudo ${u}`;
            exec(c, (e, out, err) => {
                if(e) socket.emit('userActionError', err);
                else { socket.emit('userActionSuccess', `Utilisateur ${u} créé.`); getSystemUsers().then(users => io.to('admin_room').emit('usersList', users)); }
            });
        } catch(e){}
    });

    socket.on('deleteUser', ({ token, targetUser }) => {
        try {
            const dec = jwt.verify(token, JWT_SECRET);
            if(dec.role !== 'admin') return;
            if(targetUser === dec.user || targetUser === 'root') { socket.emit('userActionError', "Action interdite."); return; }
            exec(`userdel -r ${targetUser.replace(/[^a-z0-9_-]/gi,'')}`, (e, out, err) => {
                if(e) socket.emit('userActionError', err);
                else { socket.emit('userActionSuccess', `Utilisateur supprimé.`); getSystemUsers().then(users => io.to('admin_room').emit('usersList', users)); }
            });
        } catch(e){}
    });

    socket.on('modifyUser', ({ token, targetUser, newPass, makeAdmin }) => {
        try {
            const dec = jwt.verify(token, JWT_SECRET);
            if(dec.role !== 'admin') return;
            const u = targetUser.replace(/[^a-z0-9_-]/gi,'');
            let cmds = [];
            if(newPass) cmds.push(`echo "${u}:${newPass.replace(/'/g,"'\\''")}" | chpasswd`);
            if(makeAdmin) cmds.push(`usermod -aG sudo ${u}`);
            else if(u !== dec.user && u !== 'root') cmds.push(`deluser ${u} sudo || true`);
            if(cmds.length) exec(cmds.join(' && '), (e) => {
                if(e) socket.emit('userActionError', "Erreur");
                else { socket.emit('userActionSuccess', "Modifié."); getSystemUsers().then(users => io.to('admin_room').emit('usersList', users)); }
            });
        } catch(e){}
    });
});

// MONITOR LOOP
setInterval(async () => {
    if (io.sockets.adapter.rooms.get('admin_room')?.size > 0) {
        try {
            const [c, m, n, f, s] = await Promise.all([si.currentLoad(), si.mem(), si.networkStats(defaultInterface), si.fsStats(), si.fsSize()]);
            let rx=0, tx=0; if(Array.isArray(n)) n.forEach(i=>{rx+=i.rx_sec;tx+=i.tx_sec}); else {rx=n.rx_sec;tx=n.tx_sec};
            let d = s.find(x => x.mount === '/') || s[0] || {size:0,used:0,use:0};
            io.to('admin_room').emit('realtimeData', {
                cpu: { load: c.currentLoad, cores: c.cpus.map(x=>x.load) },
                ram: { used: m.active, total: m.total, percent: (m.active/m.total)*100 },
                swap: { used: m.swapused, total: m.swaptotal, percent: m.swaptotal>0?(m.swapused/m.swaptotal)*100:0 },
                disk: { read: f.rx_sec/1048576, write: f.wx_sec/1048576, storage: {total:d.size,used:d.used,percent:d.use} },
                net: { rxBytes: rx, txBytes: tx }
            });
        } catch(e){}
    }
}, 1000);

httpServer.listen(3000, () => console.log('🚀 Server Ready on 3000'));