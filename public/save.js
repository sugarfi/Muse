Nexus.context = Tone.context._context;
let time = 0;

const editor = ace.edit('editor');
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");
const oscilloscope = new Nexus.Oscilloscope('#graph');
oscilloscope.colorize('accent', '#ff0');
oscilloscope.colorize('fill', '#222');
editor.setReadOnly(true);

fetch(window.location.href, {
    method: 'GET',
}).then(r => r.text()).then(text => {
    editor.setValue(text.split('\x00')[0], 1);
})

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
