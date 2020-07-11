const express = require('express');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

const app = express();
app.use(express.json());
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const makeID = () => uuid.v4().split('-')[0];
const on = [];
const sockets = {};
const rooms = {};

app.post('/', (req, res) => {
    const id = makeID();
    on.push(id);
    res.redirect(`/room/${id}`);
});

app.get('/room/:id', (req, res) => {
    const { id } = req.params;
    if (on.includes(id)) {
        res.sendFile(path.join(__dirname, 'public/room.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public/404.html'));
    }
});

app.post('/save', (req, res) => {
    const { text } = req.body;
    const id = uuid.v4().split('-')[0];
    fs.writeFileSync(`saves/${id}.js`, text);
    res.send(id);
    res.end();
});

app.get('/save/:id', (req, res) => {
    const { id } = req.params;
    const saves = fs.readdirSync('saves');
    if (saves.includes(`${id}.js`)) {
        const code = fs.readFileSync(`saves/${id}.js`, 'utf-8');
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(code);
        res.write('\x00');
        res.write(fs.readFileSync(path.join(__dirname, 'public/save.html'), 'utf-8'));
        res.end();
    } else {
        res.sendFile(path.join(__dirname, 'public/404.html'));
    }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('set info', (id, name) => {
        sockets[socket.id] = {
            id: id,
            name: name,
        };
        if (!rooms[id]) {
            rooms[id] = [];
        }
        rooms[id].push(socket);
        io.emit('code', id, name);
    });

    socket.on('chat', (room, user, msg) => {
        io.emit('chat', room, user, msg);
    });

    socket.on('insert', (room, user, pos, text) => {
        io.emit('insert', room, user, pos, text);
    });

    socket.on('remove', (room, user, pos) => {
        io.emit('remove', room, user, pos);
    });

    socket.on('res', (room, user, text) => {
        io.emit('res', room, user, text);
    });
});

app.use(function(req, res, next){
    res.sendFile(path.join(__dirname, 'public/404.html'));
});

http.listen(8080, () => console.log('Server up!'));
