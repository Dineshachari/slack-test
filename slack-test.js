require('dotenv').config();
const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');
const Groq = require('groq-sdk');

console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN);
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET);
console.log('SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID);
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY);
console.log('SLACK_ADMIN_MEMBER_ID:', process.env.SLACK_ADMIN_MEMBER_ID);

// Initialize Slack Bolt app
const client = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initialize Slack WebClient
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Variables
let BOT_ID;
let messageCounts = {};
let welcomeMessages = {};
let userApiCounts = {};

const BAD_WORDS = ['hmm', 'no', 'tim'];

// Helper functions for scheduling messages
function getTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

function getTodayAt(hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return getTimestamp(date);
}

function getTomorrowAt(hours, minutes) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return getTimestamp(date);
}

function getNextMondayAt(hours, minutes) {
  const date = new Date();
  date.setDate(date.getDate() + (1 + 7 - date.getDay()) % 7);
  date.setHours(hours, minutes, 0, 0);
  return getTimestamp(date);
}

const SCHEDULED_MESSAGES = [
  {
    text: 'Good morning team! Remember our daily standup at 10 AM.',
    post_at: getTomorrowAt(9, 45),
    channel: process.env.SLACK_CHANNEL_ID, // Use environment variable for channel ID
  },
  {
    text: 'Don\'t forget to submit your weekly reports by 5 PM today!',
    post_at: getTodayAt(16, 0),
    channel: process.env.SLACK_CHANNEL_ID,
  },
  {
    text: 'Welcome to a new week! Let\'s make it productive.',
    post_at: getNextMondayAt(9, 0),
    channel: process.env.SLACK_CHANNEL_ID,
  },
];

const MAX_API_REQUESTS = 10;

// Custom prompts
const CUSTOM_PROMPTS = {
  default: "You are a fitness coach who is kind and loves to help people who are trying to be better by working out. You are expert in coaching people to reach their peak fitness. You are hyper focused on fitness and fitness only. If a user tries to talk about topics other than fitness you will politely steer the conversation back to fitness.",
  creative: "You are a creative writer. Please respond with imaginative and colorful language.",
  technical: "You are a technical expert. Please provide detailed and accurate technical information.",
  fitness: "You are a fitness coach who is kind and loves to help people who are trying to be better by working out. You are expert in coaching people to reach their peak fitness. You are hyper focused on fitness and fitness only. If a user tries to talk about topics other than fitness you will politely steer the conversation back to fitness."
};

// Get the bot user ID
(async () => {
  try {
    const authResponse = await client.client.auth.test();
    BOT_ID = authResponse.user_id;
  } catch (error) {
    console.error('Error fetching bot user ID:', error);
  }
})();

// ... (other functions remain the same)

async function scheduleMessages(messages) {
  const ids = [];
  for (const msg of messages) {
    try {
      const response = await client.client.chat.scheduleMessage({
        channel: msg.channel,
        text: msg.text,
        post_at: msg.post_at,
      });
      ids.push(response.scheduled_message_id);
    } catch (error) {
      console.error('Error scheduling message:', error);
    }
  }
  return ids;
}

async function listScheduledMessages(channel) {
  try {
    const response = await client.client.chat.scheduledMessages.list({ channel });
    return response.scheduled_messages.map(msg => msg.id);
  } catch (error) {
    console.error('Error listing scheduled messages:', error);
    return [];
  }
}

async function deleteScheduledMessages(ids, channel) {
  for (const id of ids) {
    try {
      await client.client.chat.deleteScheduledMessage({ channel, scheduled_message_id: id });
    } catch (e) {
      console.error('Error deleting scheduled message:', e);
    }
  }
}

// ... (rest of the code remains the same)

// Server setup
(async () => {
  try {
    // Delete any existing scheduled messages
    const ids = await listScheduledMessages(process.env.SLACK_CHANNEL_ID);
    await deleteScheduledMessages(ids, process.env.SLACK_CHANNEL_ID);
    
    // Schedule new messages
    await scheduleMessages(SCHEDULED_MESSAGES);
    
    await client.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Error during server setup:', error);
  }
})();
