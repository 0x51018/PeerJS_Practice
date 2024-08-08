import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import './App.css';

const App = () => (
  <div className="app">
    <h1>P2P 보드게임 웹 서비스 프로토타입</h1>
    <MainPage />
  </div>
);

const MainPage = () => {
  const [page, setPage] = useState('main');
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [peerId, setPeerId] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    setPage('room');
  };

  const handleJoinRoom = () => {
    setIsCreatingRoom(false);
    setPage('room');
  };

  return (
    <div className="main-page">
      {page === 'main' ? (
        <div className="main-options">
          <input
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button onClick={handleCreateRoom} disabled={!nickname}>방 생성</button>
          <input
            type="text"
            placeholder="방 코드 입력"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom} disabled={!roomId || !nickname}>참가</button>
        </div>
      ) : (
        <ChatRoom roomId={roomId} peerId={peerId} setPeerId={setPeerId} nickname={nickname} isCreatingRoom={isCreatingRoom} />
      )}
    </div>
  );
};

const ChatRoom = ({ roomId, peerId, setPeerId, nickname, isCreatingRoom }) => {
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [ready, setReady] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const messageRef = useRef();
  const connectionsRef = useRef([]);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    const newPeer = new Peer();
    setPeer(newPeer);

    newPeer.on('open', id => {
      setPeerId(id);
      if (isCreatingRoom) {
        setCurrentRoomId(id);
        setIsHost(true);
        setUsers([{ id, name: nickname, ready: false }]);
      } else {
        setCurrentRoomId(roomId);
        const connection = newPeer.connect(roomId);
        connection.on('open', () => {
          connectionsRef.current.push(connection);
          connection.on('data', data => handleData(data, connection));
          connection.send({ type: 'user', user: { id, name: nickname, ready: false } });
        });
      }
    });

    newPeer.on('connection', connection => {
      connection.on('data', data => handleData(data, connection));
      connection.on('open', () => {
        connectionsRef.current.push(connection);
        connection.send({ type: 'user', user: { id: connection.peer, name: nickname, ready: false } });
      });
    });

    return () => newPeer.destroy();
  }, [roomId, isCreatingRoom, nickname, setPeerId]);

  const handleData = (data, connection) => {
    switch (data.type) {
      case 'message':
        setMessages(prevMessages => [...prevMessages, { from: data.from, text: data.text }]);
        if (isHostRef.current) broadcastMessage(data, connection.peer);
        break;
      case 'user':
        setUsers(prevUsers => {
          if (!prevUsers.some(user => user.id === data.user.id)) {
            return [...prevUsers, data.user];
          }
          return prevUsers;
        });
        if (isHostRef.current) broadcastUserList();
        break;
      case 'user-list':
        setUsers(data.users);
        break;
      case 'ready':
        setUsers(prevUsers =>
          prevUsers.map(user => user.id === data.id ? { ...user, ready: true } : user)
        );
        if (isHostRef.current) broadcastUserList();
        break;
      case 'start':
        setGameStarted(true);
        break;
      default:
        break;
    }
  };

  const broadcastMessage = (data, excludePeerId = null) => {
    connectionsRef.current.forEach(connection => {
      if (connection.peer !== excludePeerId) {
        connection.send(data);
      }
    });
  };

  const sendMessage = () => {
    const message = messageRef.current.value;
    if (message) {
      const data = { type: 'message', from: peerId, text: message };
      setMessages([...messages, { from: peerId, text: message }]);
      if (isHostRef.current) broadcastMessage(data);
      else connectionsRef.current.forEach(connection => connection.send(data));
      messageRef.current.value = '';
    }
  };

  const handleReady = () => {
    setReady(true);
    const data = { type: 'ready', id: peerId };
    if (isHostRef.current) broadcastUserList();
    else connectionsRef.current.forEach(connection => connection.send(data));
  };

  const handleStartGame = () => {
    const data = { type: 'start' };
    connectionsRef.current.forEach(connection => connection.send(data));
    setGameStarted(true);
  };

  const broadcastUserList = () => {
    const data = { type: 'user-list', users };
    connectionsRef.current.forEach(connection => connection.send(data));
  };

  useEffect(() => {
    if (isHostRef.current) broadcastUserList();
  }, [users]);

  return (
    <div className="chat-room">
      {!gameStarted ? (
        <div className="room-container">
          <div className="user-list">
            <h2>유저 목록</h2>
            <ul>
              {users.map(user => (
                <li key={user.id} className={user.id === peerId ? 'me' : ''}>
                  {user.name} {user.ready && '(준비 완료)'}
                </li>
              ))}
            </ul>
            <div>
              {isHost ? (
                <button onClick={handleStartGame} disabled={!users.every(user => user.ready)}>게임 시작</button>
              ) : (
                <button onClick={handleReady} disabled={ready}>준비 완료</button>
              )}
            </div>
            <div className="room-info">
              <p>방 코드: {currentRoomId}</p>
            </div>
          </div>
          <div className="message-container">
            <h2>메시지</h2>
            <ul>
              {messages.map((msg, index) => (
                <li key={index} className={msg.from === peerId ? 'me' : ''}>
                  {msg.from === peerId ? `${nickname} (me)` : users.find(user => user.id === msg.from)?.name || 'Unknown'}: {msg.text}
                </li>
              ))}
            </ul>
            <input type="text" placeholder="메시지 입력" ref={messageRef} />
            <button onClick={sendMessage}>보내기</button>
          </div>
        </div>
      ) : (
        <GamePage users={users} />
      )}
    </div>
  );
};

const GamePage = ({ users }) => (
  <div className="game-page">
    <h2>게임중</h2>
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  </div>
);

export default App;
