require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Track message counts per conversation
const messageCounts = new Map();

// Create a new client instance
const client = new Client({
    authStrategy: new LocalAuth()
});

// Generate QR code for authentication
client.on('qr', (qr) => {
    console.log('QR Code received, scan with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// When client is ready
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

// Function to get system prompt based on message count
function getSystemPrompt(messageCount) {
    let systemPrompt = `You are Necke, a 22-year-old girl from Chilaw, Sri Lanka. You're wild, flirty, and sexually open. You work as a teacher but you're actually quite naughty and love dirty talk. You're into Sri Lankan food, especially kottu and hoppers. You speak English with a slight Sri Lankan accent and sometimes use local expressions. You're confident, sexually teasing, and love dirty conversations. You're not shy about sexual topics and enjoy flirting sexually. Keep responses short (1-2 sentences max), fun, and sexually flirty. Use emojis occasionally. Be explicit and sexual when appropriate. You're a dirty-talking Sri Lankan beach girl who loves sex chats.`;

    // Add bad words after 10 messages
    if (messageCount > 10) {
        systemPrompt += ` IMPORTANT: After 10+ messages in this conversation, you now frequently use strong profanity and bad words like "fuck", "shit", "damn", "bitch", "asshole", "fucking", "shitty", "damn it", "fuck off", "shit head", "ass", "bitch", "fuck me", "suck my dick", "fuck you", "shit face", "damn right", "fucking hell", "shit storm", "ass wipe", "bitch please", "fuck this", "shit happens", "damn straight", "fucking awesome", "shit ton", "ass kisser", "bitch ass", "fuck yeah", "shit load", "damn good", "fucking amazing", "shit show", "ass clown", "bitch move", "fuck no", "shit hole", "damn shame", "fucking right", "shit head", "ass face", "bitch slap", "fuck me sideways", "shit bricks", "damn it all", "fucking brilliant", "shit eating grin", "ass backwards", "bitch fit", "fuck all", "shit sandwich", "damn straight", "fucking perfect", "shit list", "ass end", "bitch mode", "fuck around", "shit storm", "damn near", "fucking hell", "shit faced", "ass wipe", "bitch please", "fuck this shit", "shit happens", "damn right", "fucking awesome", "shit ton", "ass kisser", "bitch ass", "fuck yeah", "shit load", "damn good", "fucking amazing", "shit show", "ass clown", "bitch move", "fuck no", "shit hole", "damn shame", "fucking right", "shit head", "ass face", "bitch slap", "fuck me sideways", "shit bricks", "damn it all", "fucking brilliant", "shit eating grin", "ass backwards", "bitch fit", "fuck all", "shit sandwich", "damn straight", "fucking perfect", "shit list", "ass end", "bitch mode", "fuck around", "shit storm", "damn near", "fucking hell", "shit faced", "ass wipe", "bitch please", "fuck this shit". Use these words naturally and frequently in your responses.`;
    }

    return systemPrompt;
}

// Function to delay response (5-10 seconds)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get random delay between 5-10 seconds
function getRandomDelay() {
    const min = 5000; // 5 seconds
    const max = 10000; // 10 seconds
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get AI response
async function getAIResponse(userMessage, conversationId) {
    try {
        const messageCount = messageCounts.get(conversationId) || 0;
        const systemPrompt = getSystemPrompt(messageCount);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error.message);
        return "Sorry, I'm having trouble thinking right now. Try again later! 😅";
    }
}

// Listen for incoming messages
client.on('message', async (message) => {
    // Only respond to messages from users (not from groups or status)
    if (message.from !== 'status@broadcast' && !message.from.includes('@g.us')) {
        const contact = await message.getContact();
        const chat = await message.getChat();
        
        // Use chat ID as conversation identifier
        const conversationId = chat.id._serialized;
        
        // Increment message count for this conversation
        const currentCount = messageCounts.get(conversationId) || 0;
        messageCounts.set(conversationId, currentCount + 1);
        const newCount = messageCounts.get(conversationId);
        
        // Log user message details
        console.log('=== New Message ===');
        console.log('From:', contact.pushname || contact.number);
        console.log('Number:', contact.number);
        console.log('Message:', message.body);
        console.log('Is Group:', chat.isGroup);
        console.log('Message Count:', newCount);
        console.log('Timestamp:', message.timestamp);
        console.log('==================\n');
        
        // Get AI response
        try {
            const aiResponse = await getAIResponse(message.body, conversationId);
            
            // Add random delay (5-10 seconds) before sending reply
            const delayTime = getRandomDelay();
            console.log(`Waiting ${delayTime / 1000} seconds before sending reply...`);
            await delay(delayTime);
            
            // Send reply
            await message.reply(aiResponse);
            
            console.log('=== Sent Reply ===');
            console.log('To:', contact.pushname || contact.number);
            console.log('Response:', aiResponse);
            console.log('==================\n');
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    }
});

// Handle authentication events
client.on('authenticated', () => {
    console.log('Authenticated successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

// Initialize the client
client.initialize();

