const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require("@adiwajshing/baileys")
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState('./session.json')
const MAIN_LOGGER = require("@adiwajshing/baileys/lib/Utils/logger").default
const logger = MAIN_LOGGER.child({})
logger.level = 'silent'
const config = require('./config');
const pino = require ('pino'); 
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) 
const fs = require("fs");
const path = require("path");
const events = require("./utils");
const {Message, Image, Video} = require('./lib/');
const { DataTypes } = require('sequelize');
const { GreetingsDB, getMessage } = require("./plugins/sql/greetings");
const got = require('got');

fs.readdirSync('./plugins/sql/').forEach(plugin => {
    if(path.extname(plugin).toLowerCase() == '.js') {
        require('./plugins/sql/' + plugin);
    }
});

const plugindb = require('./plugins/sql/plugin');

String.prototype.format = function () {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
      return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

const startSock = async () => {
     await config.DATABASE.sync();
     console.log('DB syncing');
     console.log('Wa-Bot Connecting to whatsapp');
     
  sock.ev.on('connection.update', async(update) => {
        const { connection, lastDisconnect } = update     
        if (connection !== "close") return

        let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

        const DR = DisconnectReason

        if (reason === DR.badSession) { console.log(`Corrupted section. Delete old session and scan the QR code.`); sock.logout(); return }
        if (reason === DR.connectionClosed) { console.log("Connection closed. Reconnecting..."); startSock(); return }
        if (reason === DR.connectionLost) { console.log("Lost connection to the server. Trying to reconnect..."); startSock(); return }
        if (reason === DR.connectionReplaced) { console.log("Current session replaced by the new one opened. Please close this session first."); sock.logout(); return }
        if (reason === DR.loggedOut) { console.log(`Session terminated by cell phone. Delete session and scan the QR code.`); sock.logout(); return }
        if (reason === DR.restartRequired) { console.log("Kingdom needed. restarting..."); startSock(); return }
        if (reason === DR.timedOut) { console.log("Connection timed out, Reconnecting..."); startSock(); return }
       })
        sock.end(`Disconnected: ${reason}|${lastDisconnect.error}`)
    sock.ev.on('creds.update', saveState)
    
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({ logger, version, printQRInTerminal: false, auth: state })
    console.log('Bot connected.✅️ To Whatsapp...');
    store.bind(sock.ev)
              
  console.log('⬇️ Installing external plugins...');
    var plugins = await plugindb.PluginDB.findAll();
        plugins.map(async (plugin) => {
            if (!fs.existsSync('./plugins/' + plugin.dataValues.name + '.js')) {
                console.log(plugin.dataValues.name);
                var response = await got(plugin.dataValues.url);
                if (response.statusCode == 200) {
                    fs.writeFileSync('./plugins/' + plugin.dataValues.name + '.js', response.body);
                    require('./plugins/' + plugin.dataValues.name + '.js');
                }     
            }
        });
          fs.readdirSync('./plugins').forEach(plugin => {
            if(path.extname(plugin).toLowerCase() == '.js') {
                require('./plugins/' + plugin);
            }
        });

        console.log('✅ Plugins installed!')
      
         console.log('Bot working...');
          await sock.sendMessage(sock.user.id, { text: `*Wa-Bot-Md Working*` });
             }
    
        sock.ev.on('message-new', async msg => {
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;
        if (config.NO_ONLINE) {
            await sock.updatePresence(messages.key.remoteJid, Presence.unavailable);
        }

        if (messages.messageStubType === 32 || messages.messageStubType === 28) {
            var gb = await getMessage(messages.key.remoteJid, 'goodbye');
            if (gb !== false) {
                await sock.sendMessage(messages.key.remoteJid, gb.message, MessageType.text);
            }
            return;
        } else if (messages.messageStubType === 27 || messages.messageStubType === 31) {
            var gb = await getMessage(messages.key.remoteJid);
            if (gb !== false) {
                await sock.sendMessage(messages.key.remoteJid, gb.message, MessageType.text);
            }
            return;
        }
   
        events.commands.map(
            async (command) =>  {
                if (msg.message && msg.message.imageMessage && msg.message.imageMessage.caption) {
                    var text_msg = msg.message.imageMessage.caption;
                } else if (msg.message && msg.message.videoMessage && msg.message.videoMessage.caption) {
                    var text_msg = msg.message.videoMessage.caption;
                } else if (msg.message) {
                    var text_msg = msg.message.extendedTextMessage === null ? msg.message.conversation : msg.message.extendedTextMessage.text;
                } else {
                    var text_msg = undefined;
                }

                if ((command.on !== undefined && (command.on === 'image' || command.on === 'photo')
                    && msg.message && msg.message.imageMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg)))) || 
                    (command.pattern !== undefined && command.pattern.test(text_msg)) || 
                    (command.on !== undefined && command.on === 'text' && text_msg) ||
                    // Video
                    (command.on !== undefined && (command.on === 'video')
                    && msg.message && msg.message.videoMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg))))) {
    
                    let sendMsg = false;
                    var chat = sock.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
    
                    if (sendMsg) {
                        if (config.SEND_READ && command.on === undefined) {
                            await sock.chatRead(msg.key.remoteJid);
                        }
                        var match = text_msg.match(command.pattern);
                        
                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo' )
                        && msg.message.imageMessage !== null) {
                            whats = new Image(sock, msg);
                        } else if (command.on !== undefined && (command.on === 'video' )
                        && msg.message.videoMessage !== null) {
                            whats = new Video(sock, msg);
                        } else {
                            whats = new Message(sock, msg);
                        }

                        if (command.deleteCommand && msg.key.fromMe) {
                            await whats.delete(); 
                        }

                        var match = text_msg.match(command.pattern);
                        
                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo' )
                        && msg.message.imageMessage !== null) {
                            whats = new Image(sock, msg);
                        } else if (command.on !== undefined && (command.on === 'video' )
                        && msg.message.videoMessage !== null) {
                            whats = new Video(sock, msg);
                        } else {
                            whats = new Message(sock, msg);
                        }

                        if (command.deleteCommand && msg.key.fromMe) {
                            await whats.delete();
                            }
                       }
                  }
              }
         )     
})
startSock()
