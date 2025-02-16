import { ChatMessage, ChatMetadata } from '../types/chatTypes';

const dummyMessage: ChatMessage[] = [
  {
    date: new Date('2025-02-16'),
    time: '10:05',
    sender: 'Alice',
    message: 'Good morning, everyone!',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:06',
    sender: 'Bob',
    message: 'Morning, Alice! How are you?',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:07',
    sender: 'Charlie',
    message: 'Hey folks, whats up?',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:08',
    sender: 'Alice',
    message: 'I am doing well, just having coffee. You?',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:09',
    sender: 'Bob',
    message: 'Same here, just woke up.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:10',
    sender: 'Charlie',
    message: 'I am about to start working on my project.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:11',
    sender: 'Alice',
    message: 'Oh, what are you working on?',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:12',
    sender: 'Charlie',
    message: 'A web app using React and TypeScript.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:13',
    sender: 'Bob',
    message: 'That sounds interesting!',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:14',
    sender: 'Alice',
    message: 'Yeah, do you need any help?',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:15',
    sender: 'Charlie',
    message: 'Not right now, but I will let you know.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:16',
    sender: 'Bob',
    message: 'Cool, I am learning React too.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:17',
    sender: 'Alice',
    message: 'Nice! Maybe we can all build something together.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:18',
    sender: 'Charlie',
    message: 'That would be awesome!',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:19',
    sender: 'Bob',
    message: 'lets brainstorm some ideas later.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:20',
    sender: 'Alice',
    message: 'Sure, I am free in the evening.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:21',
    sender: 'Charlie',
    message: 'Me too, lets do it!',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:22',
    sender: 'Bob',
    message: 'Alright, lets catch up later then.',
  },
  {
    date: new Date('2025-02-16'),
    time: '10:23',
    sender: 'Alice',
    message: 'Sounds great, see you later!',
  },
  { date: new Date('2025-02-16'), time: '10:24', sender: 'Charlie', message: 'Bye for now!' },
];

const dummyMetadata = {
  language: 'en',
  os: 'ios',
  firstMessageDate: new Date('2025-02-16'),
  lastMessageDate: new Date('2025-02-16'),
  senders: { Alice: 7, Bob: 6, Charlie: 7 },
  sendersShort: { Alice: 'A', Bob: 'B', Charlie: 'C' },
  fileName: 'chat_log.txt',
} as ChatMetadata;

export { dummyMessage, dummyMetadata };
