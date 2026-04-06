import { useState, useEffect, CSSProperties } from 'react';
import { T, F, FM } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface Call {
  id: string;
  toNumber: string;
  fromNumber: string;
  status: string;
  duration: number;
  direction: string;
  recordingUrl: string | null;
  transcript: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: T.green,
  'in-progress': T.yellow,
  ringing: T.blue,
  failed: T.red,
  initiating: T.yellow,
  busy: T.orange,
  'no-answer': T.red,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const r: any = await api('/calls');
      const data = await r.json();
      setCalls(Array.isArray(data) ? data : data.calls || []);
    } catch { setCalls([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCall = async () => {
    if (!phoneNumber.trim()) return;
    try {
      await api('/calls/initiate', {
        method: 'POST',
        body: JSON.stringify({ to: phoneNumber }),
      });
      setPhoneNumber('');
      setToast('Call initiated');
      load();
    } catch { setToast('Call failed — check Twilio config'); }
  };

  const handleTranscribe = async (callId: string) => {
    setTranscribing(true);
    try {
      const r: any = await api(`/ai/transcribe/${callId}`, { method: 'POST' });
      const data = await r.json();
      setToast('Transcription complete');
      setSelectedCall(prev => prev ? { ...prev, transcript: data.transcript } : null);
      load();
    } catch { setToast('Transcription failed'); }
    setTranscribing(false);
  };

  const page: CSSProperties = { padding: 32, overflowY: 'auto', height: '100%', fontFamily: F };
  const card: CSSProperties = {
    background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
    padding: 16, marginBottom: 8, cursor: 'pointer', transition: 'all .15s',
  };

  if (loading) return <div style={page}><p style={{ color: T.text2 }}>Loading...</p></div>;

  return (
    <div style={page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Calls</h1>
          <p style={{ fontSize: 13, color: T.text2, margin: '4px 0 0' }}>VoIP call log with AI transcription</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Inp value={phoneNumber} onChange={setPhoneNumber} placeholder="+40 7XX XXX XXX" />
          <Btn onClick={handleCall}>Call</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCall ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div>
          {calls.length === 0 && <p style={{ color: T.text3, fontSize: 13 }}>No calls yet.</p>}
          {calls.map(call => (
            <div key={call.id} style={{ ...card, borderColor: selectedCall?.id === call.id ? T.accent : T.border }}
              onClick={() => setSelectedCall(call)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                    {call.direction === 'outbound' ? '\u2197' : '\u2199'} {call.toNumber || call.fromNumber}
                  </span>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 4, fontFamily: FM }}>
                    {formatDuration(call.duration)} | {new Date(call.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge text={call.status} color={STATUS_COLORS[call.status] || T.text3} />
                  {call.recordingUrl && <span title="Has recording" style={{ fontSize: 16 }}>{'\uD83C\uDFA4'}</span>}
                  {call.transcript && <span title="Transcribed" style={{ fontSize: 16 }}>{'\uD83D\uDCDD'}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedCall && (
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Call Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div><span style={{ fontSize: 11, color: T.text3 }}>Direction</span><br /><span style={{ fontSize: 13, color: T.text }}>{selectedCall.direction}</span></div>
              <div><span style={{ fontSize: 11, color: T.text3 }}>Duration</span><br /><span style={{ fontSize: 13, color: T.text, fontFamily: FM }}>{formatDuration(selectedCall.duration)}</span></div>
              <div><span style={{ fontSize: 11, color: T.text3 }}>To</span><br /><span style={{ fontSize: 13, color: T.text, fontFamily: FM }}>{selectedCall.toNumber}</span></div>
              <div><span style={{ fontSize: 11, color: T.text3 }}>From</span><br /><span style={{ fontSize: 13, color: T.text, fontFamily: FM }}>{selectedCall.fromNumber}</span></div>
            </div>

            {selectedCall.recordingUrl && (
              <div style={{ marginBottom: 12 }}>
                <audio controls src={selectedCall.recordingUrl} style={{ width: '100%' }} />
              </div>
            )}

            {selectedCall.recordingUrl && !selectedCall.transcript && (
              <Btn onClick={() => handleTranscribe(selectedCall.id)} disabled={transcribing}>
                {transcribing ? 'Transcribing...' : '\uD83C\uDFA4 Transcribe with AI'}
              </Btn>
            )}

            {selectedCall.transcript && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8 }}>Transcript</h4>
                <pre style={{
                  fontSize: 12, color: T.text, background: T.surface2, padding: 12,
                  borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: FM, maxHeight: 300, overflowY: 'auto',
                }}>{selectedCall.transcript}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
