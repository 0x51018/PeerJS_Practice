export const GamePage = ({ users }) => (
  <div className="game-page">
    <h2>게임중</h2>
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  </div>
);