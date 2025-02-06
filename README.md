# Kindroid Discord Multi-Bot Manager

A Node.js service that manages multiple Discord bots, each tied to a unique Kindroid AI persona. The system uses just-in-time (JIT) message fetching to provide conversation context without storing large message logs.

## Features

- Run multiple Discord bots from a single Node.js service
- Each bot is tied to a unique Kindroid AI persona
- JIT message fetching (last ~30 messages) for conversation context
- Efficient caching to respect Discord API rate limits
- Graceful error handling and shutdown
- Easy configuration via environment variables

## Prerequisites

- Node.js 16.x or higher
- Discord Bot Token(s) from the [Discord Developer Portal](https://discord.com/developers/applications)
- Kindroid AI API access (API key and AI IDs)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/KindroidAI/Kindroid-discord.git
   cd Kindroid-discord
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the `.env.example` file to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   - Add your Kindroid API key and endpoint
   - Add Discord bot tokens
   - Add Kindroid AI IDs

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Bot Commands

- `!kindroid <message>` - Interact with the bot
  - The bot will fetch the last ~30 messages for context
  - Process them through the Kindroid AI
  - Respond with the AI's reply

## Configuration

### Environment Variables

- `KINDROID_INFER_URL`: Kindroid AI API endpoint
- `KINDROID_API_KEY`: Your Kindroid API key
- `BOT_TOKEN_1`: Discord bot token for first bot
- `PERSONA_ID_1`: Kindroid persona ID for first bot
- `BOT_TOKEN_2`: (Optional) Discord bot token for second bot
- `PERSONA_ID_2`: (Optional) Kindroid persona ID for second bot

### Adding More Bots

1. Add new environment variables for the bot token and persona ID
2. Add a new configuration object in `src/index.js`

## Architecture

```
+---------------------+    (Bot Token A)    +---------+
|  Server A          |  <----------------> |Discord-A|
|  - many channels   |     conversation    +---------+
+---------------------+                           ^
                                                 |
+---------------------+    (Bot Token B)    +---------+
|  Server B          |  <----------------> |Discord-B|
|  - fewer channels  |     conversation    +---------+
+---------------------+                           ^
                                                 |
                              +----------------------------------+
                              | Node.js Multi-Bot Manager        |
                              |  - Loads multiple bot tokens     |
                              |  - On each command:              |
                              |    * fetch last N messages       |
                              |    * call Kindroid AI           |
                              |    * respond to channel         |
                              +----------------------------------+
```

## Error Handling

- Failed bot initializations are logged but don't prevent other bots from starting
- Message fetch failures are caught and reported to the user
- API call timeouts and errors are handled gracefully
- Graceful shutdown on SIGINT and SIGTERM

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
