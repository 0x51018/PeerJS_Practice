import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Container, Box, Grid, Paper } from '@mui/material';
import { ChatRoom } from './ChatRoom';

export const MainPage = () => {
  const [page, setPage] = useState('main');
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [peerId, setPeerId] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [roomIdError, setRoomIdError] = useState('');
  const [validationState, setValidationState] = useState(''); // "" | "nickname" | "room"

  useEffect(() => {
    if (validationState === 'nickname' || validationState === 'room') {
      updateNicknameValid();
    }
    if (validationState === 'room') {
      updateRoomIDValid();
    }
  }, [nickname, roomId, validationState]);

  const handleCreateRoom = () => {
    setValidationState('nickname');
    if (updateNicknameValid()) {
      setIsCreatingRoom(true);
      setPage('room');
    }
  };

  const handleJoinRoom = () => {
    setValidationState('room');
    if (updateNicknameValid() && updateRoomIDValid()) {
      setIsCreatingRoom(false);
      setPage('room');
    }
  };

  const checkNickname = () => {
    if (nickname.length < 2 || nickname.length > 20) return "Nickname must be between 2 and 20 characters.";
    const validPattern = /^[가-힣a-zA-Z0-9_-]+$/;
    if (!validPattern.test(nickname)) return "Nickname can only contain Korean characters, letters, numbers, underscores, and hyphens.";
    if (nickname.startsWith(' ') || nickname.endsWith(' ')) return "Nickname cannot start or end with a space.";
    if (/^[\-_]/.test(nickname) || /[\-_]$/.test(nickname)) return "Nickname cannot start or end with an underscore or hyphen.";
    if (/[\-_]{2,}/.test(nickname)) return "Nickname cannot contain consecutive underscores or hyphens.";
    return "valid";
  };

  const updateNicknameValid = () => {
    const result = checkNickname();
    if (result === "valid") {
      setNicknameError('');
      return true;
    } else {
      setNicknameError(result);
      return false;
    }
  };

  const updateRoomIDValid = () => {
    if (roomId.length !== 5) {
      setRoomIdError('Room code must be 5 characters.');
      return false;
    } else {
      setRoomIdError('');
      return true;
    }
  };

  return (
    <Container maxWidth={false}>
      <Box mt={8}>
        {page === 'main' ? (
          <Container maxWidth="sm">
            <Paper elevation={5} sx={{ padding: 5 }}>
              <Typography variant="h4" align="center" gutterBottom>
                Start a New Game <br/>or<br/>Join an Existing One
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Enter Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    margin="normal"
                    error={Boolean(nicknameError)}
                    helperText={nicknameError}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateRoom}
                    disabled={!nickname}
                    fullWidth
                  >
                    Create Room
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Enter Room Code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    margin="normal"
                    error={Boolean(roomIdError)}
                    helperText={roomIdError}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleJoinRoom}
                    disabled={!roomId || !nickname}
                    fullWidth
                  >
                    Join Room
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Container>
          
        ) : (
          <ChatRoom roomId={roomId} peerId={peerId} setPeerId={setPeerId} nickname={nickname} isCreatingRoom={isCreatingRoom} />
        )}
      </Box>
    </Container>
  );
};
