import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { GamePage } from './GamePage';
import { Container, Box, Typography, List, ListItem, ListItemText, Button, TextField, Paper, Grid } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import StarsIcon from '@mui/icons-material/Stars';
import PersonIcon from '@mui/icons-material/Person';
import Tooltip from '@mui/material/Tooltip';
import ClickAwayListener from '@mui/material/ClickAwayListener';

export const ChatRoom = ({ roomId, peerId, setPeerId, nickname, isCreatingRoom }) => {
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [ready, setReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);
  const messageRef = useRef();
  const connections = useRef([]);
  const isHost = useRef(false);
  const idPrefix = "user-";
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newPeer = new Peer(idPrefix + createRandomId());
    setPeer(newPeer);

    newPeer.on('open', id => {
      setPeerId(id);
      if (isCreatingRoom) {
        setCurrentRoomId(id.slice(idPrefix.length));
        isHost.current = true;
        setUsers([{ id, name: nickname, ready: false }]);
      } else {
        setCurrentRoomId(roomId);
        const conn = newPeer.connect(idPrefix + roomId);
        conn.on('open', () => {
          connections.current.push(conn);
          conn.on('data', data => handleData(data, conn));
          conn.send({ type: 'user', user: { id, name: nickname, ready: false } });
        });
      }
    });

    newPeer.on('connection', connection => {
      connection.on('data', data => handleData(data, connection));
  
      connection.peerConnection.oniceconnectionstatechange = () => {
        const state = connection.peerConnection.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
          connections.current = connections.current.filter(conn => conn.peer !== connection.peer);
          setUsers(prevUsers => prevUsers.filter(user => user.id !== connection.peer));
        }
      };

      connection.on('open', () => {
        connections.current.push(connection);
        connection.send({ type: 'user', user: { id: connection.peer, name: nickname, ready: false } });
      });
    });

    return () => newPeer.destroy();
  }, [roomId, isCreatingRoom, nickname, setPeerId]);

  useEffect(() => {
    if (isHost.current) broadcastUserList();
  }, [users]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleData = (data, connection) => {
    switch (data.type) {
      case 'message':
        setMessages(prevMessages => [...prevMessages, { from: data.from, text: data.text }]);
        if (isHost.current) broadcastMessage(data, connection.peer);
        break;
      case 'user':
        setUsers(prevUsers => {
          if (!prevUsers.some(user => user.id === data.user.id)) return [...prevUsers, data.user];
          return prevUsers;
        });
        if (isHost.current) broadcastUserList();
        break;
      case 'user-list':
        setUsers(data.users);
        break;
      case 'ready':
        setUsers(prevUsers => prevUsers.map(user => user.id === data.id ? { ...user, ready: true } : user));
        if (isHost.current) broadcastUserList();
        break;
      case 'start':
        setGameStarted(true);
        break;
      default:
        console.warn(`Unknown data type: ${data.type}`);
        break;
    }
  };

  const createRandomId = () => {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  const broadcastMessage = (data, excludePeerId = null) => {
    connections.current.forEach(connection => {
      if (connection.peer !== excludePeerId) connection.send(data);
    });
  };

  const sendMessage = () => {
    const message = messageRef.current.value;
    if (message) {
      const data = { type: 'message', from: peerId, text: message };
      setMessages([...messages, { from: peerId, text: message }]);
      if (isHost.current) broadcastMessage(data);
      else connections.current.forEach(connection => connection.send(data));
      messageRef.current.value = '';
    }
  };

  const handleReady = () => {
    setReady(true);
    const data = { type: 'ready', id: peerId };
    if (isHost.current) broadcastUserList();
    else connections.current.forEach(connection => connection.send(data));
  };

  const handleStartGame = () => {
    if (users.every(user => user.id === peerId || user.ready)) {
      const data = { type: 'start' };
      connections.current.forEach(connection => connection.send(data));
      setGameStarted(true);
    }
  };

  const broadcastUserList = () => {
    const data = { type: 'user-list', users };
    connections.current.forEach(connection => connection.send(data));
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(currentRoomId);
    setCopyTooltipOpen(true);
  };

  const handleTooltipClose = () => {
    setCopyTooltipOpen(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <Container 
      maxWidth={'xl'} 
      sx={{ 
        width: '95%', 
        mt: 4, 
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {!gameStarted ? (
        <Grid container spacing={4} justifyContent="center" alignItems="stretch">
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, height: '100%', position: 'relative' }}>
              <Typography variant="h5" gutterBottom>
                유저 목록
              </Typography>
              <List>
                {users.map(user => (
                  <ListItem 
                    key={user.id} 
                    sx={{
                      border: user.id === peerId ? '2px solid blue' : '1px solid black',
                      bgcolor: 'white',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          {user.name}
                          {(user.id === peerId) && (
                            <PersonIcon sx={{ ml: 1, color: 'blue' }} />
                          )}
                          <Box sx={{ flexGrow: 1 }} />
                          {(isHost.current && user.id === peerId || !isHost.current && user.id === idPrefix+roomId) && (
                            <StarsIcon sx={{ ml: 1, color: 'gold' }} />
                          )}
                          {user.ready && (
                            <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                          )}
                          {(isHost.current && user.id !== peerId && !user.ready || !isHost.current && !user.ready && user.id !== idPrefix+roomId) && (
                            <CheckCircleIcon color="disabled" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              <Box mt={2} textAlign="center">
                {isHost.current ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleStartGame}
                    disabled={!users.every(user => user.id === peerId || user.ready)}
                  >
                    게임 시작
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleReady}
                    disabled={ready}
                  >
                    준비 완료
                  </Button>
                )}
              </Box>
              <Box 
                mt={2} 
                textAlign="center"
                sx={{
                  position: 'absolute',
                  bottom: '18px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '100%',
                }}
              >
                <ClickAwayListener onClickAway={handleTooltipClose}>
                  <Tooltip
                    title="복사됨!"
                    open={copyTooltipOpen}
                    disableFocusListener
                    disableHoverListener
                    disableTouchListener
                    onClose={handleTooltipClose}
                    leaveDelay={1500}
                    PopperProps={{
                      disablePortal: true,
                    }}
                  >
                    <Typography 
                      variant="h4" 
                      color="rgba(0, 120, 0, 0.84)" 
                      onClick={() => {
                        handleCopyRoomCode();
                        setTimeout(handleTooltipClose, 700);
                      }} 
                      sx={{ 
                        cursor: 'pointer', 
                        textDecoration: 'underline',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                        fontWeight: 'bold',
                      }}
                    >
                      {currentRoomId}
                    </Typography>
                  </Tooltip>
                </ClickAwayListener>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom>
                메시지
              </Typography>
              <List 
                sx={{ 
                  flexGrow: 1, 
                  overflowY: 'auto', 
                  fontFamily: 'monospace', 
                  fontSize: '1.4rem',
                  lineHeight: '1.4',
                  height: '400px',
                }}
              >
                {messages.map((msg, index) => (
                  <ListItem 
                    key={index} 
                    sx={{ 
                      paddingTop: '4px', 
                      paddingBottom: '4px',
                      borderBottom: '1px solid #ccc',
                    }}
                  >
                    <ListItemText
                      primary={`${users.find(user => user.id === msg.from)?.name || 'Unknown'} : ${msg.text}`}
                    />
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
              <Box mt={2} display="flex">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="메시지 입력"
                  inputRef={messageRef}
                  onKeyPress={handleKeyPress}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={sendMessage}
                  sx={{ ml: 1, minWidth: '50px', padding: '8px' }}
                >
                  <SendIcon />
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <GamePage users={users} />
      )}
    </Container>
  );
};
