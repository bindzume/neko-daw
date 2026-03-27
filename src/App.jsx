import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, Trash2, Volume2, Music, Waves, Settings2, Download, Upload } from 'lucide-react';
import MidiWriter from 'midi-writer-js';

// --- Music Theory & Constants ---
const BASE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INTERVAL_ROMANS = {
  0: 'I', 1: '♭II', 2: 'II', 3: '♭III', 4: 'III', 5: 'IV', 6: '♭V', 7: 'V', 8: '♭VI', 9: 'VI', 10: '♭VII', 11: 'VII'
};

const SCALES = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor (Natural)': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
};

const DRAW_MODES = {
  'Single Note': { type: 'single', mood: '🎹 Basic Tools' },
  'Diatonic Triad': { type: 'diatonic', steps: [0, 2, 4], mood: '🎼 In-Key (Follows Scale)' },
  'Diatonic 7th': { type: 'diatonic', steps: [0, 2, 4, 6], mood: '🎼 In-Key (Follows Scale)' },
  
  'Major Triad': { type: 'fixed', semitones: [0, 4, 7], mood: '☀️ Happy / Bright' },
  'Major 6th': { type: 'fixed', semitones: [0, 4, 7, 9], mood: '☀️ Happy / Bright' },
  'Major 7th': { type: 'fixed', semitones: [0, 4, 7, 11], mood: '☀️ Happy / Bright' },
  'Major 9th': { type: 'fixed', semitones: [0, 4, 7, 11, 14], mood: '☀️ Happy / Bright' },
  
  'Minor Triad': { type: 'fixed', semitones: [0, 3, 7], mood: '🌧️ Sad / Melancholic' },
  'Minor 6th': { type: 'fixed', semitones: [0, 3, 7, 9], mood: '🌧️ Sad / Melancholic' },
  'Minor 7th': { type: 'fixed', semitones: [0, 3, 7, 10], mood: '🌧️ Sad / Melancholic' },
  'Minor 9th': { type: 'fixed', semitones: [0, 3, 7, 10, 14], mood: '🌧️ Sad / Melancholic' },
  
  'Dominant 7th': { type: 'fixed', semitones: [0, 4, 7, 10], mood: '⚡ Tense / Bluesy' },
  'Dominant 9th': { type: 'fixed', semitones: [0, 4, 7, 10, 14], mood: '⚡ Tense / Bluesy' },
  
  'Diminished Triad': { type: 'fixed', semitones: [0, 3, 6], mood: '👻 Suspenseful / Dark' },
  'Diminished 7th': { type: 'fixed', semitones: [0, 3, 6, 9], mood: '👻 Suspenseful / Dark' },
  'Half-Dim 7th': { type: 'fixed', semitones: [0, 3, 6, 10], mood: '👻 Suspenseful / Dark' },
  
  'Augmented Triad': { type: 'fixed', semitones: [0, 4, 8], mood: '✨ Dreamy / Magical' },
  
  'Sus2': { type: 'fixed', semitones: [0, 2, 7], mood: '☁️ Open / Floating' },
  'Sus4': { type: 'fixed', semitones: [0, 5, 7], mood: '☁️ Open / Floating' },
  
  'Power Chord (5th)': { type: 'fixed', semitones: [0, 7], mood: '🎸 Strong / Powerful' },
};

const DRAW_MODE_GROUPS = Object.entries(DRAW_MODES).reduce((acc, [mode, data]) => {
  acc[data.mood] = acc[data.mood] || [];
  acc[data.mood].push(mode);
  return acc;
}, {});

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle'];
const TIME_SIGNATURES = ['3/4', '4/4', '5/4', '6/8', '7/8'];

const CHORD_DICTIONARY = {
  '0,4,7': '',
  '0,3,7': 'm',
  '0,3,6': 'dim',
  '0,4,8': 'aug',
  '0,2,7': 'sus2',
  '0,5,7': 'sus4',
  '0,7': '5',
  '0,4,7,11': 'maj7',
  '0,3,7,10': 'm7',
  '0,4,7,10': '7',
  '0,3,6,9': 'dim7',
  '0,3,6,10': 'm7b5',
  '0,4,7,9': '6',
  '0,3,7,9': 'm6'
};

const PROGRESSIONS = {
  'Pop Punk (I-V-vi-IV)': [1, 5, 6, 4],
  'Jazz Turnaround (ii-V-I)': [2, 5, 1],
  'Doo-wop (I-vi-IV-V)': [1, 6, 4, 5],
  'R&B / Neo-Soul (IV-V-iii-vi)': [4, 5, 3, 6],
  'Epic / Soundtrack (vi-IV-I-V)': [6, 4, 1, 5],
  'Classic Rock (I-IV-V)': [1, 4, 5],
  'Pachelbel Canon (I-V-vi-iii-IV-I-IV-V)': [1, 5, 6, 3, 4, 1, 4, 5]
};



const getTimeSigConfig = (ts) => {
  const [beats, value] = ts.split('/').map(Number);
  const stepsPerBeat = 16 / value; // e.g., 4 -> 4 (16ths), 8 -> 2 (16ths)
  const stepsPerBar = beats * stepsPerBeat;
  return { beats, value, stepsPerBeat, stepsPerBar };
};

// Generate notes from C6 down to C3
const ALL_NOTES = [];
for (let oct = 6; oct >= 3; oct--) {
  for (let i = 11; i >= 0; i--) {
    if (oct === 6 && i > 0) continue; // Only include C6, not C#6 or above
    const noteName = BASE_NOTES[i];
    const midi = (oct + 1) * 12 + i;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    ALL_NOTES.push({ 
      id: `${noteName}${oct}`, 
      name: `${noteName}${oct}`, 
      baseName: noteName, 
      octave: oct,
      midi, 
      freq 
    });
  }
}

const getDurationLabel = (steps, stepsPerBar) => {
  if (steps === stepsPerBar) return '1 Bar';
  if (steps === stepsPerBar * 2) return '2 Bars';
  
  switch (steps) {
    case 1: return '1/16';
    case 2: return '1/8';
    case 3: return '3/16';
    case 4: return '1/4';
    case 6: return '3/8';
    case 8: return '1/2';
    case 12: return '3/4';
    default: return null;
  }
};

export default function App() {
  
  // --- State ---
  const [activeNotes, setActiveNotes] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [volume, setVolume] = useState(0.5);
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedScale, setSelectedScale] = useState('Major');
  const [waveform, setWaveform] = useState('triangle');
  const [drawMode, setDrawMode] = useState('Single Note');
  
  // --- Heatmap State ---
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  
  // --- AI Assist State ---
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const [lastActionKey, setLastActionKey] = useState(null);
  
  // --- UI State ---
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- Drag & Drop State ---
  const [dragAction, setDragAction] = useState(null);

  // --- Dynamic Grid Calculations ---
  const { stepsPerBeat, stepsPerBar } = useMemo(() => getTimeSigConfig(timeSignature), [timeSignature]);

  // Dynamically calculate total steps based on placed notes (minimum 2 bars)
  const numSteps = useMemo(() => {
    let maxStep = 0;
    Object.entries(activeNotes).forEach(([key, duration]) => {
      const parts = key.split('-');
      // Assuming ID format is Note-Octave-StepIndex
      const stepIndex = parseInt(parts[parts.length - 1], 10);
      const endStep = stepIndex + duration;
      if (endStep > maxStep) maxStep = endStep;
    });
    
    // Determine how many bars we need to fit the furthest note
    const requiredBars = Math.ceil(maxStep / stepsPerBar);
    
    // Always provide at least 2 bars, and leave 1 empty bar at the end for infinite expansion
    const totalBars = Math.max(2, requiredBars + 1);
    
    return totalBars * stepsPerBar;
  }, [activeNotes, stepsPerBar]);

  // Ensure visual playhead wraps properly
  const visualStep = currentStep % numSteps;

  // --- Refs for Audio & Interval ---
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const gridRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // NEW REFS for Lookahead Scheduling
  const scheduleIntervalRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentAudioStepRef = useRef(0);
  
  // Keep mutable state in refs for the audio loop to avoid dependency cycle restarts
  const stateRef = useRef({ activeNotes, waveform, volume, bpm, numSteps });
  useEffect(() => {
    stateRef.current = { activeNotes, waveform, volume, bpm, numSteps };
  }, [activeNotes, waveform, volume, bpm, numSteps]);

  // --- Audio Engine ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playOscillator = (freq, durationSteps = 1, startTime) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    
    osc.type = stateRef.current.waveform;
    osc.frequency.value = freq;
    
    // Calculate real duration based on BPM
    const stepTimeSecs = 60 / stateRef.current.bpm / 4;
    const durationSecs = durationSteps * stepTimeSecs;
    
    // Envelope
    const attack = 0.01;
    const release = 0.1;
    const sustainTime = Math.max(0, durationSecs - attack);
    
    // Use the provided startTime, NOT ctx.currentTime
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.3, startTime + attack);
    noteGain.gain.setValueAtTime(0.3, startTime + attack + sustainTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + sustainTime + release);
    
    osc.connect(noteGain);
    noteGain.connect(masterGainRef.current);
    
    osc.start(startTime);
    osc.stop(startTime + durationSecs + release + 0.1);
  };

  // --- Playback Loop ---
  // --- Playback Loop (Lookahead Scheduler) ---
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      const ctx = audioCtxRef.current;
      
      const lookahead = 25.0; // How frequently to wake up (ms)
      const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

      // Reset the audio clock if starting fresh
      if (nextNoteTimeRef.current === 0) {
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
      }

      const scheduler = () => {
        const bpm = stateRef.current.bpm;
        const stepTimeSecs = (60 / bpm) / 4;
        const currentNumSteps = stateRef.current.numSteps;

        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
          const stepToPlay = currentAudioStepRef.current;
          const timeToPlay = nextNoteTimeRef.current;

          // 1. Schedule Audio (High Precision)
          ALL_NOTES.forEach((note) => {
            const duration = stateRef.current.activeNotes[`${note.id}-${stepToPlay}`];
            if (duration) {
              playOscillator(note.freq, duration, timeToPlay);
            }
          });

          // 2. Schedule UI Update (Sync playhead visually)
          const timeUntilPlayMs = (timeToPlay - ctx.currentTime) * 1000;
          setTimeout(() => {
            setCurrentStep(stepToPlay);
          }, Math.max(0, timeUntilPlayMs));

          // 3. Advance internal audio clock and step counter
          nextNoteTimeRef.current += stepTimeSecs;
          currentAudioStepRef.current = (stepToPlay + 1) % currentNumSteps;
        }
      };

      scheduleIntervalRef.current = setInterval(scheduler, lookahead);
    } else {
      if (scheduleIntervalRef.current) {
        clearInterval(scheduleIntervalRef.current);
      }
    }

    return () => clearInterval(scheduleIntervalRef.current);
  }, [isPlaying]); 
  // Notice we removed 'bpm' from the dependency array! 
  // Because the scheduler reads from stateRef.current.bpm, you can now 
  // live-tweak the BPM slider while playing without audio glitching.

  // Update master volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  // --- Interactions ---
const togglePlay = () => {
    if (!isPlaying) {
      // Sync the audio engine step to wherever the visual step currently is
      currentAudioStepRef.current = currentStep;
      // Force the audio clock to recalibrate to 'now'
      nextNoteTimeRef.current = 0; 
    }
    setIsPlaying(!isPlaying);
  };

const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    // Reset internal audio pointers
    currentAudioStepRef.current = 0;
    nextNoteTimeRef.current = 0;
  };

  const clearGrid = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setActiveNotes({});
    setLastActionKey(null);
    setShowClearConfirm(false);
  };

  // --- Export & Import ---
  const exportProject = () => {
    const projectData = {
      activeNotes,
      bpm,
      timeSignature,
      volume,
      selectedKey,
      selectedScale,
      waveform,
      drawMode
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melody-maker-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.activeNotes) setActiveNotes(data.activeNotes);
        if (data.bpm) setBpm(data.bpm);
        if (data.timeSignature) setTimeSignature(data.timeSignature);
        if (data.volume) setVolume(data.volume);
        if (data.selectedKey) setSelectedKey(data.selectedKey);
        if (data.selectedScale) setSelectedScale(data.selectedScale);
        if (data.waveform) setWaveform(data.waveform);
        if (data.drawMode) setDrawMode(data.drawMode);
      } catch (err) {
        alert("Failed to load project. The file might be corrupted.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // --- Scale Logic ---
  const scaleNotes = useMemo(() => {
    const rootIndex = BASE_NOTES.indexOf(selectedKey);
    const intervals = SCALES[selectedScale];
    return intervals.map(interval => BASE_NOTES[(rootIndex + interval) % 12]);
  }, [selectedKey, selectedScale]);

  // --- Chord & Placement Logic ---
  const getChordNotes = (clickedNoteId) => {
    const clickedNote = ALL_NOTES.find(n => n.id === clickedNoteId);
    if (drawMode === 'Single Note') return [clickedNote];

    const modeDef = DRAW_MODES[drawMode];
    const targetNotes = [];

    if (modeDef.type === 'fixed') {
      modeDef.semitones.forEach(st => {
        const targetMidi = clickedNote.midi + st;
        const found = ALL_NOTES.find(n => n.midi === targetMidi);
        if (found) targetNotes.push(found);
      });
    } else if (modeDef.type === 'diatonic') {
      const diatonicNotes = ALL_NOTES.filter(n => scaleNotes.includes(n.baseName));
      const clickedIdx = diatonicNotes.findIndex(n => n.id === clickedNoteId);
      if (clickedIdx !== -1) {
        modeDef.steps.forEach(step => {
          const targetIdx = clickedIdx - step;
          if (targetIdx >= 0 && targetIdx < diatonicNotes.length) {
            targetNotes.push(diatonicNotes[targetIdx]);
          }
        });
      } else {
        targetNotes.push(clickedNote);
      }
    }
    return targetNotes;
  };

  // --- AI Suggestion Logic ---
  const suggestedNotes = useMemo(() => {
    if (!aiAssistEnabled || !lastActionKey) return [];
    const duration = activeNotes[lastActionKey];
    if (!duration) return [];

    const [noteId, stepIndexStr] = lastActionKey.split('-');
    const stepIndex = parseInt(stepIndexStr, 10);
    const nextStep = stepIndex + duration;

    // Get notes in current scale, ordered low to high
    const diatonicNotesAsc = [...ALL_NOTES]
      .sort((a, b) => a.midi - b.midi)
      .filter(n => scaleNotes.includes(n.baseName));

    const currentIndex = diatonicNotesAsc.findIndex(n => n.id === noteId);
    if (currentIndex === -1) return [];

    const suggestions = [];
    const addSugg = (idx, label, type) => {
      if (idx >= 0 && idx < diatonicNotesAsc.length) {
        const sId = diatonicNotesAsc[idx].id;
        // Only suggest if the spot is currently empty
        if (!activeNotes[`${sId}-${nextStep}`]) {
          suggestions.push({ id: sId, stepIndex: nextStep, duration, label, type });
        }
      }
    };

    // Voice Leading Rules applied:
    addSugg(currentIndex + 1, 'Up', 'smooth');
    addSugg(currentIndex - 1, 'Down', 'smooth');
    addSugg(currentIndex + 2, '+3rd', 'leap');
    addSugg(currentIndex - 2, '-3rd', 'leap');

    return suggestions;
  }, [aiAssistEnabled, lastActionKey, activeNotes, scaleNotes]);

  // --- Progression Insertion ---
  const insertProgression = (e) => {
    const progressionName = e.target.value;
    if (!progressionName) return;
    
    const degrees = PROGRESSIONS[progressionName];
    if (!degrees) return;

    const diatonicNotesAsc = [...ALL_NOTES]
      .sort((a, b) => a.midi - b.midi)
      .filter(n => scaleNotes.includes(n.baseName));
    
    // Start around octave 3 for chords
    let rootNoteIdx = diatonicNotesAsc.findIndex(n => n.baseName === selectedKey && n.octave === 3);
    if (rootNoteIdx === -1) rootNoteIdx = diatonicNotesAsc.findIndex(n => n.baseName === selectedKey);

    // Find the last used bar to append to (or 0 if empty)
    let maxStep = 0;
    Object.entries(activeNotes).forEach(([key, duration]) => {
      const stepIndex = parseInt(key.split('-').pop(), 10);
      maxStep = Math.max(maxStep, stepIndex + duration);
    });
    const startStep = Math.ceil(maxStep / stepsPerBar) * stepsPerBar;

    const newNotes = { ...activeNotes };
    
    degrees.forEach((degree, index) => {
      // degree is 1-based index into the scale
      const chordRootIdx = rootNoteIdx + (degree - 1);
      const thirdIdx = chordRootIdx + 2;
      const fifthIdx = chordRootIdx + 4;
      
      // Add a bass note one full octave down (scaleNotes.length steps down)
      const bassIdx = chordRootIdx - scaleNotes.length;
      
      const stepPos = startStep + (index * stepsPerBar);

      [bassIdx, chordRootIdx, thirdIdx, fifthIdx].forEach(idx => {
        if (idx >= 0 && idx < diatonicNotesAsc.length) {
          const note = diatonicNotesAsc[idx];
          // Insert the chord with a full bar duration
          newNotes[`${note.id}-${stepPos}`] = stepsPerBar; 
        }
      });
    });

    setActiveNotes(newNotes);
    
    // Reset the select dropdown
    e.target.value = '';
  };

  // --- Drag & Draw Handlers ---
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragAction || !gridRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Calculate unbounded step to allow drag past current grid edges (which expands it)
      const stepIndex = Math.max(0, Math.floor(x / 40));
      const newDuration = Math.max(1, stepIndex - dragAction.startStep + 1);
      
      setActiveNotes(prev => {
        const updated = { ...prev };
        let changed = false;
        dragAction.notes.forEach(noteId => {
          const key = `${noteId}-${dragAction.startStep}`;
          if (updated[key] !== newDuration) {
            updated[key] = newDuration;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    };

    const handlePointerUp = () => {
      if (dragAction) setDragAction(null);
    };

    if (dragAction) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragAction]);

  const handleBackgroundDown = (noteId, stepIndex, e) => {
    const targetNotes = getChordNotes(noteId);
    const newNotes = { ...activeNotes };
    
    targetNotes.forEach(note => {
      newNotes[`${note.id}-${stepIndex}`] = 1; 
    });
    
    setActiveNotes(newNotes);
    setDragAction({ type: 'draw', notes: targetNotes.map(n => n.id), startStep: stepIndex });
    setLastActionKey(`${noteId}-${stepIndex}`); // Track the latest note for AI suggestions

    if (!isPlaying) {
      initAudio();
      // FIX: Pass the precise current time as the third parameter
      const currentTime = audioCtxRef.current.currentTime;
      targetNotes.forEach(note => playOscillator(note.freq, 1, currentTime));
    }
  };

  const handleSuggestionClick = (sugg, e) => {
    e.stopPropagation();
    handleBackgroundDown(sugg.id, sugg.stepIndex, e);
  };

  const handleNoteBodyDown = (noteId, stepIndex, e) => {
    e.stopPropagation();
    setActiveNotes(prev => {
      const updated = { ...prev };
      delete updated[`${noteId}-${stepIndex}`];
      return updated;
    });
  };

  const handleNoteEdgeDown = (noteId, stepIndex, e) => {
    e.stopPropagation();
    setDragAction({ type: 'resize', notes: [noteId], startStep: stepIndex });
  };

  const exportToMidi = () => {
    const { activeNotes, bpm } = stateRef.current;
    const track = new MidiWriter.Track();
    track.addEvent(new MidiWriter.TempoEvent({ bpm: bpm }));

    // midi-writer-js uses ticks. Standard is 128 ticks per beat.
    // Our grid is 16th notes (4 steps per beat). 
    // Therefore, 1 step = 128 / 4 = 32 ticks.
    const TICKS_PER_STEP = 32;

    const events = [];

    // Parse our dictionary into an array of events
    Object.entries(activeNotes).forEach(([key, durationSteps]) => {
      const [noteId, stepIndexStr] = key.split('-');
      const stepIndex = parseInt(stepIndexStr);
      
      // Note IDs are like "C4", "F#5". We can pass these directly to midi-writer!
      events.push(new MidiWriter.NoteEvent({
        pitch: [noteId],
        duration: `T${durationSteps * TICKS_PER_STEP}`,
        startTick: stepIndex * TICKS_PER_STEP,
        velocity: 80 // Default medium velocity
      }));
    });

    track.addEvent(events);

    const write = new MidiWriter.Writer(track);
    const dataUri = write.dataUri();
    
    // Trigger Download
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'melody-maker-export.mid';
    link.click();
  };

  const exportToWav = async () => {
    const { activeNotes, bpm, waveform } = stateRef.current;
    
    // 1. Calculate total song length
    let maxStep = 0;
    Object.entries(activeNotes).forEach(([key, duration]) => {
      const step = parseInt(key.split('-')[1]);
      if (step + duration > maxStep) maxStep = step + duration;
    });

    if (maxStep === 0) return alert("Nothing to export!");

    const stepTimeSecs = (60 / bpm) / 4;
    const tailSeconds = 2; // Allow final note reverb/release to fade
    const totalDurationSecs = (maxStep * stepTimeSecs) + tailSeconds;

    // 2. Setup Offline Context (44.1kHz, 1 channel mono for this synth)
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, sampleRate * totalDurationSecs, sampleRate);

    // 3. Schedule all notes onto the offline context
    Object.entries(activeNotes).forEach(([key, durationSteps]) => {
      const [noteId, stepIndexStr] = key.split('-');
      const stepIndex = parseInt(stepIndexStr);
      
      const noteObj = ALL_NOTES.find(n => n.id === noteId);
      if (!noteObj) return;

      const startTime = stepIndex * stepTimeSecs;
      const durationSecs = durationSteps * stepTimeSecs;

      // Replicate the exact synth envelope from playOscillator()
      const osc = offlineCtx.createOscillator();
      const noteGain = offlineCtx.createGain();
      
      osc.type = waveform;
      osc.frequency.value = noteObj.freq;
      
      const attack = 0.01;
      const release = 0.1;
      const sustainTime = Math.max(0, durationSecs - attack);
      
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + attack);
      noteGain.gain.setValueAtTime(0.3, startTime + attack + sustainTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + sustainTime + release);
      
      osc.connect(noteGain);
      noteGain.connect(offlineCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + durationSecs + release + 0.1);
    });

    // 4. Render the audio as fast as possible
    const renderedBuffer = await offlineCtx.startRendering();

    // 5. Convert AudioBuffer to WAV format (Standard PCM encode)
    const wavBlob = audioBufferToWav(renderedBuffer);
    
    // 6. Trigger Download
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'melody-maker-bounce.wav';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to write standard WAV headers
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const result = new Float32Array(buffer.length * numChannels);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        result[i * numChannels + channel] = channelData[i];
      }
    }

    const dataLength = result.length * (bitDepth / 8);
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  // --- Live Chord Detection ---
  const currentChord = useMemo(() => {
    const playingNotes = Object.entries(activeNotes)
      .filter(([key, duration]) => {
        const stepIndex = parseInt(key.split('-').pop(), 10);
        return visualStep >= stepIndex && visualStep < stepIndex + duration;
      })
      .map(([key]) => {
        const parts = key.split('-');
        const nId = parts.slice(0, parts.length - 1).join('-'); 
        return ALL_NOTES.find(n => n.id === nId);
      })
      .filter(Boolean);

    if (playingNotes.length === 0) return null;
    if (playingNotes.length === 1) return playingNotes[0].baseName;

    const sortedNotes = [...playingNotes].sort((a, b) => a.midi - b.midi);
    const bassMidi = sortedNotes[0].midi;
    const bassName = sortedNotes[0].baseName;
    const pitchClasses = [...new Set(sortedNotes.map(n => n.midi % 12))];

    if (pitchClasses.length === 1) return bassName;

    for (let i = 0; i < pitchClasses.length; i++) {
      const rootPc = pitchClasses[i];
      const intervals = pitchClasses.map(pc => (pc - rootPc + 12) % 12).sort((a, b) => a - b);
      const intervalStr = intervals.join(',');

      if (CHORD_DICTIONARY[intervalStr] !== undefined) {
        const rootNote = sortedNotes.find(n => n.midi % 12 === rootPc);
        const rootName = rootNote ? rootNote.baseName : BASE_NOTES[rootPc];
        const suffix = CHORD_DICTIONARY[intervalStr];
        return rootPc === (bassMidi % 12) ? `${rootName}${suffix}` : `${rootName}${suffix}/${bassName}`;
      }
    }

    return `${bassName}(?)`; // Unrecognized chord shape
  }, [activeNotes, visualStep]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans select-none overflow-hidden relative">
      
      {/* Custom Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Clear All Notes?</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to completely clear the grid? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClear}
                className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                Clear Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Melody Maker</h1>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Transport Controls */}
          <div className="flex items-center bg-gray-950 rounded-lg border border-gray-800 p-1">
            <button 
              onClick={togglePlay}
              className={`p-2 rounded-md flex items-center gap-2 transition-colors ${isPlaying ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
            <button 
              onClick={stopPlayback}
              className="p-2 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Tempo, Time & Settings */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase tracking-wider text-xs font-bold">Tempo</span>
              <input 
                type="number" 
                value={bpm} 
                onChange={(e) => setBpm(Math.max(40, Math.min(300, Number(e.target.value))))}
                className="bg-gray-950 border border-gray-700 rounded px-2 py-1 w-16 text-center focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase tracking-wider text-xs font-bold">Time</span>
              <select 
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-center"
              >
                {TIME_SIGNATURES.map(ts => <option key={ts} value={ts}>{ts}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 border-l border-gray-800 pl-4 ml-1">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 accent-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-gray-400" />
              <select 
                value={waveform}
                onChange={(e) => setWaveform(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 capitalize"
              >
                {WAVEFORMS.map(wf => <option key={wf} value={wf}>{wf}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-l border-gray-800 pl-4 ml-2">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={importProject} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-sm"
              title="Import Project"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button 
              onClick={exportProject}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-sm"
              title="Export Project"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={clearGrid}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors text-sm ml-2"
              title="Clear Grid"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button 
  onClick={exportToMidi}
  className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
>
  <Download size={16} /> MIDI
</button>

<button 
  onClick={exportToWav}
  className="flex items-center gap-2 px-3 py-1 bg-pink-500/20 text-pink-400 rounded hover:bg-pink-500/30 transition-colors"
>
  <Waves size={16} /> Bounce WAV
</button>
          </div>
        </div>
      </header>

      {/* Theory & Scale Toolbar */}
      <div className="flex items-center px-6 py-2 bg-gray-800 border-b border-gray-700 shrink-0 gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-gray-300">Scale Highlight:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Key:</span>
          <select 
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            {BASE_NOTES.map(note => <option key={note} value={note}>{note}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">Scale:</span>
          <select 
            value={selectedScale}
            onChange={(e) => setSelectedScale(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          >
            {Object.keys(SCALES).map(scale => <option key={scale} value={scale}>{scale}</option>)}
          </select>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-2"></div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">Draw Tool:</span>
          <select 
            value={drawMode}
            onChange={(e) => setDrawMode(e.target.value)}
            className="bg-gray-900 border border-indigo-500/50 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 text-indigo-200 font-medium max-w-[220px]"
          >
            {Object.entries(DRAW_MODE_GROUPS).map(([mood, modes]) => (
              <optgroup key={mood} label={mood}>
                {modes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        
        <div className="w-px h-5 bg-gray-700 mx-2"></div>
        
        <div className="flex items-center gap-2">
          <select 
            value=""
            onChange={insertProgression}
            className="bg-indigo-900/30 border border-indigo-500/50 hover:bg-indigo-900/50 transition-colors rounded px-2 py-1 focus:outline-none focus:border-indigo-400 text-indigo-200 font-medium cursor-pointer"
          >
            <option value="" disabled>➕ Insert Progression...</option>
            {Object.keys(PROGRESSIONS).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-2"></div>

        <button
          onClick={() => setHeatmapEnabled(!heatmapEnabled)}
          className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-colors ${
            heatmapEnabled 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700 hover:text-gray-300'
          }`}
        >
          {heatmapEnabled ? '🔥 Heatmap: ON' : 'Heatmap: OFF'}
        </button>

        <button
          onClick={() => setAiAssistEnabled(!aiAssistEnabled)}
          className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-colors ${
            aiAssistEnabled 
              ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50' 
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700 hover:text-gray-300'
          }`}
        >
          {aiAssistEnabled ? '✨ AI Assist: ON' : 'AI Assist: OFF'}
        </button>
        
        <div className="w-px h-5 bg-gray-700 mx-2"></div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded shadow-inner" title="Live Chord Detection">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Live Chord:</span>
          <span className="text-indigo-300 font-bold min-w-[3rem] text-center text-sm">
            {currentChord || '---'}
          </span>
        </div>
        
        <div className="ml-auto text-xs flex items-center gap-4 text-gray-400">
          {heatmapEnabled ? (
            <>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 border border-indigo-400 rounded-sm"></div> Downbeat</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-teal-500 border border-teal-400 rounded-sm"></div> Upbeat</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 border border-amber-400 rounded-sm"></div> Syncopated</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-900/60 border border-indigo-500/50 rounded-sm"></div> Root Note</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-700 rounded-sm border border-slate-600"></div> In Scale</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-950 rounded-sm border border-gray-900"></div> Out of Scale</div>
            </>
          )}
        </div>
      </div>

      {/* Piano Roll Area */}
      <div className="flex-1 overflow-auto flex bg-gray-950">
        
        {/* Left Sidebar: Piano Keys */}
        <div className="sticky left-0 z-20 flex flex-col shrink-0 bg-gray-900 border-r border-gray-700 shadow-xl" style={{ width: '80px' }}>
          <div className="h-8 shrink-0 border-b border-gray-700 bg-gray-800 sticky top-0 z-30 flex items-center justify-center text-[10px] text-gray-500 uppercase tracking-widest">Keys</div>
          
          {ALL_NOTES.map((note) => {
            const isBlack = note.baseName.includes('#');
            const inScale = scaleNotes.includes(note.baseName);
            const isRoot = note.baseName === selectedKey;
            
            // Calculate scale degree relative to root
            const rootIndex = BASE_NOTES.indexOf(selectedKey);
            const noteIndex = BASE_NOTES.indexOf(note.baseName);
            const interval = (noteIndex - rootIndex + 12) % 12;
            const roman = INTERVAL_ROMANS[interval];
            
            return (
              <div 
                key={`key-${note.id}`} 
                className={`flex items-center justify-end pr-2 text-xs border-b border-gray-800 h-8 shrink-0 transition-colors duration-100 relative
                  ${isBlack ? 'bg-gray-950 text-gray-500' : 'bg-gray-200 text-gray-800'}
                  ${isRoot ? (isBlack ? 'border-l-4 border-l-indigo-500 !bg-indigo-950' : 'border-l-4 border-l-indigo-500 !bg-indigo-100') : ''}
                  ${inScale && !isRoot ? (isBlack ? '!bg-gray-800' : '!bg-white') : ''}
                `}
              >
                {note.baseName === 'C' && (
                  <span className="absolute left-1 text-[10px] font-bold opacity-50">C{note.octave}</span>
                )}
                
                <div className="flex items-center gap-1.5">
                  {inScale && (
                    <span className={`text-[9px] font-bold ${isRoot ? 'text-indigo-500' : 'text-current opacity-40'}`}>
                      {roman}
                    </span>
                  )}
                  <span className={`font-medium w-5 text-right ${isRoot ? 'text-indigo-600' : ''}`}>{note.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Area: Grid */}
        <div className="flex flex-col min-w-max relative touch-none" ref={gridRef}>
          
          {/* Step Timeline Header */}
          <div className="h-8 shrink-0 flex sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
            {Array.from({ length: numSteps }).map((_, stepIndex) => {
              const isBar = stepIndex % stepsPerBar === 0;
              const isBeat = stepIndex % stepsPerBeat === 0;
              
              return (
                <div 
                  key={`header-${stepIndex}`} 
                  className={`w-10 flex-shrink-0 flex items-center justify-center text-[10px] border-r border-gray-700 transition-colors
                    ${isBar ? 'bg-gray-700 font-bold text-gray-200' : isBeat ? 'bg-gray-700/40 font-semibold text-gray-400' : 'text-gray-600'}
                    ${visualStep === stepIndex ? '!bg-indigo-500/40 text-indigo-100' : ''}
                  `}
                >
                  {isBar ? (stepIndex / stepsPerBar) + 1 : isBeat ? (stepIndex % stepsPerBar) / stepsPerBeat + 1 : ''}
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          <div className="relative">
            {/* Playhead Marker */}
            <div 
              className="absolute top-0 bottom-0 bg-white/10 border-l border-white/30 z-30 pointer-events-none transition-all duration-75"
              style={{ width: '40px', left: `${visualStep * 40}px` }}
            />

            {ALL_NOTES.map((note) => {
              const inScale = scaleNotes.includes(note.baseName);
              const isRoot = note.baseName === selectedKey;
              
              return (
                <div key={`row-${note.id}`} className="relative flex h-8 shrink-0">
                  
                  {/* Background Grid Cells (Clickable to ADD) */}
                  {Array.from({ length: numSteps }).map((_, stepIndex) => {
                    const isBar = stepIndex % stepsPerBar === 0;
                    const isBeat = stepIndex % stepsPerBeat === 0;
                    
                    return (
                      <div
                        key={`cell-${note.id}-${stepIndex}`}
                        onPointerDown={(e) => handleBackgroundDown(note.id, stepIndex, e)}
                        className={`w-10 flex-shrink-0 border-b cursor-pointer transition-colors duration-50
                          ${isBar ? 'border-r border-r-gray-500' : isBeat ? 'border-r border-r-gray-700' : 'border-r border-r-gray-800'}
                          ${isRoot ? 'border-b-indigo-900/50' : inScale ? 'border-b-gray-700' : 'border-b-gray-900'}
                          ${isRoot ? 'bg-indigo-900/60 hover:bg-indigo-800/80' :
                            inScale ? 'bg-slate-700 hover:bg-slate-600' : 
                            'bg-gray-950 hover:bg-gray-900'
                          }
                        `}
                      />
                    );
                  })}

                  {/* AI Suggested Ghost Notes */}
                  {suggestedNotes.filter(s => s.id === note.id).map(sugg => (
                    <div
                      key={`sugg-${sugg.id}-${sugg.stepIndex}`}
                      onPointerDown={(e) => handleSuggestionClick(sugg, e)}
                      className="absolute top-0 h-full p-[2px] cursor-pointer z-10 group"
                      style={{ 
                        left: `${sugg.stepIndex * 40}px`, 
                        width: `${sugg.duration * 40}px` 
                      }}
                    >
                      <div className={`w-full h-full rounded-sm border border-dashed flex items-center justify-center px-1 transition-all
                        ${sugg.type === 'smooth' 
                          ? 'bg-teal-500/10 border-teal-500/50 hover:bg-teal-500/30' 
                          : 'bg-fuchsia-500/10 border-fuchsia-500/50 hover:bg-fuchsia-500/30'
                        }
                      `}>
                        <span className={`text-[9px] font-bold pointer-events-none select-none drop-shadow-md truncate
                          ${sugg.type === 'smooth' ? 'text-teal-300/80' : 'text-fuchsia-300/80'}
                        `}>
                          {sugg.label}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Foreground Active Notes (Clickable to REMOVE) */}
                  {Array.from({ length: numSteps }).map((_, stepIndex) => {
                    const duration = activeNotes[`${note.id}-${stepIndex}`];
                    if (!duration) return null;
                    
                    let noteColorClass = "bg-indigo-500 border-indigo-400"; // Default
                    
                    if (heatmapEnabled) {
                      if (stepIndex % stepsPerBeat === 0) {
                        noteColorClass = "bg-indigo-500 border-indigo-400"; // Downbeat
                      } else if (stepIndex % (stepsPerBeat / 2) === 0) {
                        noteColorClass = "bg-teal-500 border-teal-400"; // Upbeat
                      } else {
                        noteColorClass = "bg-amber-500 border-amber-400"; // Syncopated
                      }
                    }
                    
                    return (
                      <div
                        key={`note-${note.id}-${stepIndex}`}
                        onPointerDown={(e) => handleNoteBodyDown(note.id, stepIndex, e)}
                        className="absolute top-0 h-full p-[2px] cursor-pointer z-20 group"
                        style={{ 
                          left: `${stepIndex * 40}px`, 
                          width: `${duration * 40}px` 
                        }}
                      >
                        <div className={`w-full h-full rounded-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] border hover:brightness-110 transition-all opacity-90 relative overflow-hidden flex items-center px-1 ${noteColorClass}`}>
                          
                          {/* Duration Text */}
                          {getDurationLabel(duration, stepsPerBar) && (
                            <span className="text-[10px] font-bold text-white/90 pointer-events-none select-none z-10 drop-shadow-md">
                              {getDurationLabel(duration, stepsPerBar)}
                            </span>
                          )}

                          {duration > 1 && (
                            <div className="absolute left-2 right-2 h-[2px] bg-black/30 rounded-full pointer-events-none"></div>
                          )}

                          {/* Edge Drag Handle */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/40 z-30 transition-colors"
                            onPointerDown={(e) => handleNoteEdgeDown(note.id, stepIndex, e)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}