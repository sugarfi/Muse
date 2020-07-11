let name = '';
Nexus.context = Tone.context._context;
let time = 0;

window.addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        if (name.length) return;
        name = document.getElementById('name').value;
        start();
    }
});

document.getElementById('go').onclick = () => {
    name = document.getElementById('name').value;
    start();
}

const start = () => {
    document.getElementById('name').remove();
    document.getElementById('go').remove();
    document.getElementById('main').style.display = 'block';

    const id = window.location.href.split('/').slice(-1)[0];
    const socket = io();
    const editor = ace.edit('editor');
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/javascript");
    const oscilloscope = new Nexus.Oscilloscope('#graph');
    oscilloscope.colorize('accent', '#ff0');
    oscilloscope.colorize('fill', '#222');

    socket.emit('set info', id, name);

    const link = window.location.href.slice(window.location.protocol.length + 2);
    document.getElementById('save-msg').innerText =
        `Want to invite a friend? Give them this link: ${link}`

    socket.on('chat', (to, user, msg) => {
        if (to != id) return;
        const chat = document.createElement('li');
        chat.innerText = `${user}: ${msg}`;
        document.getElementById('log').appendChild(chat);
    });

    socket.on('insert', (to, user, pos, text) => {
        if (to != id) return;
        if (user == name) return;
        editor.session.insert(pos, text);
    });

    socket.on('remove', (to, user, pos) => {
        if (to != id) return;
        if (user == name) return;
        editor.session.remove(pos);
    });

    socket.on('code', (room, user) => {
        if (room != id) return;
        socket.emit('res', room, user, editor.getValue());
    });

    socket.on('res', (to, user, code) => {
        if (code.length == 0) return;
        if (to != id) return;
        if (user != name) return;
        editor.setValue(code, 1);
    });

    document.getElementById('msg').onkeydown = (e) => {
        if (e.key == 'Enter') {
            socket.emit('chat', id, name, document.getElementById('msg').value);
            document.getElementById('msg').value = '';
        }
    }

    document.getElementById('save').onclick = () => {
        document.getElementById('save-msg').innerText = 'Saving...';
        fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
            },
            body: JSON.stringify({
                text: editor.getValue(),
            }),
        }).then(r => r.text()).then(text => {
            if (text == 'error') {
                document.getElementById('save-msg').innerText = 'Error saving - try again later';
            } else {
                const a = document.createElement('a');
                a.setAttribute('href', `/save/${text}`);
                a.innerText = 'Saved! Click here to view';
                document.getElementById('save-msg').innerText = '';
                document.getElementById('save-msg').appendChild(a);
            }
        });
    }

    editor.session.on('change', function(delta) {
        console.log(delta);
        if (editor.curOp && editor.curOp.command.name) {
            if (delta.action == 'insert') {
                const text = delta.lines.join('\n');
                socket.emit('insert', id, name, delta.start, text);
            } else if (delta.action == 'remove') {
                socket.emit('remove', id, name,
                    new ace.Range(delta.start.row, delta.start.column, delta.end.row, delta.end.column));
            }
        }
    });

    document.getElementById('run').onclick = () => {
        const code = Function('playNote', 'playChord', editor.getValue());
        let synth = new Tone.PolySynth(4, Tone.Synth).toMaster();
        oscilloscope.connect(Tone.Master);

        const playNote = (note, duration) => {
            if (typeof(note) == "string") {
                if (!(note.match(/[a-gA-G][#b]?[0-8]/))) {
                    console.error(`Invalid note ${note}`);
                    return;
                }
            }
            Tone.Transport.schedule(() => synth.triggerAttackRelease(note, duration ?? '8n'), time);
            time += Tone.Time(duration ?? '8n');
        }

        const playChord = (notes, duration) => {
            for (let note of notes) {
                if (typeof(note) == "string") {
                    if (!(note.match(/[a-gA-G][#b]?[0-8]/))) {
                        console.error(`Invalid note ${note}`);
                        return;
                    }
                }
            }
            Tone.Transport.schedule(() => synth.triggerAttackRelease(notes, duration ?? '8n'), time);
            time += Tone.Time(duration ?? '8n');
        }

        code(playNote, playChord);
        Tone.Transport.start();
        setTimeout(() => {
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
        }, time * 1000);
        time = 0;
    }
}
