/**
 * Serviciu pentru conexiunea WebSocket in timp real folosind Socket.IO.
 *
 * Rolul acestui fisier:
 * - Gestioneaza conexiunea WebSocket catre serverul backend
 * - Ofera functii pentru conectare, deconectare si acces la instanta socket-ului
 * - Foloseste token-ul JWT pentru autentificarea conexiunii WebSocket
 *
 * Cum se foloseste:
 *   import { connectSocket, disconnectSocket, getSocket } from './socket.service';
 *   const socket = connectSocket();
 *   socket.on('client:updated', (data) => { ... });
 *   disconnectSocket(); // la logout
 *
 * Cum se modifica:
 * - Pentru a adauga un nou eveniment de ascultat, foloseste getSocket()?.on('event', handler)
 * - Pentru a adauga reconectare automata, configureaza optiunile reconnection in io()
 * - Pentru a adauga logging mai detaliat, extinde handler-ele connect/disconnect
 *
 * Evenimente posibile emise de server (exemple):
 * - 'client:created'  - cand un client nou este creat
 * - 'client:updated'  - cand un client este modificat
 * - 'client:moved'    - cand un client este mutat intre etape
 * - 'notification'    - notificari in timp real
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

/**
 * Instanta singleton a socket-ului.
 * Se pastreaza o singura conexiune activa la un moment dat.
 */
let socket: Socket | null = null;

/**
 * Creeaza si returneaza conexiunea WebSocket.
 * Daca exista deja o conexiune activa, o returneaza fara a crea una noua.
 *
 * @returns Socket - Instanta Socket.IO conectata
 *
 * Configurare:
 * - auth.token: token-ul JWT pentru autentificare pe server
 * - transports: incearca mai intai WebSocket, apoi fallback la polling HTTP
 * - URL '/': se conecteaza la acelasi host care serveste aplicatia
 *   (in development, Vite proxy-ul redirecteaza catre backend)
 */
export function connectSocket(): Socket {
  /** Daca socket-ul exista si este conectat, il returneaza direct */
  if (socket?.connected) return socket;

  /** Creeaza o noua conexiune Socket.IO cu autentificare JWT */
  socket = io('/', {
    auth: { token: getAccessToken() },
    transports: ['websocket', 'polling'],
  });

  /** Handler pentru evenimentul de conectare reusita */
  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  /** Handler pentru evenimentul de deconectare */
  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  return socket;
}

/**
 * Deconecteaza socket-ul si elibereaza referinta.
 * Se apeleaza la logout sau la unmount-ul aplicatiei.
 */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Returneaza instanta curenta a socket-ului (sau null daca nu este conectat).
 * Util pentru a asculta evenimente sau a emite mesaje din componente.
 *
 * Exemplu:
 *   const socket = getSocket();
 *   if (socket) {
 *     socket.on('client:updated', handleUpdate);
 *   }
 */
export function getSocket(): Socket | null {
  return socket;
}
