const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const clientID = '661830396778-8uvls7avn3m7.apps.googleusercontent.com';
const clientSecret = 'GOCSPX-BDlKpR1ccpUGhV768l';
const redirectURI = 'http://localhost:3000/oauth2callback';
const oAuth2Client = new OAuth2Client(clientID, clientSecret, redirectURI);

// Authenticate with Google and get access token
async function authorize() {
    oAuth2Client.setCredentials({
        refresh_token: '1//0gYu4C-L9IrPLRkQWFJMAME98QXAmQgvHkYKbIau_wh6AwxJHlhWiETFNSluqR1euPWAhIKuLn_s2M'
    });
    
    const access_token = await oAuth2Client.getAccessToken();
    console.log('Access token:', access_token.token);
}

// Fetch the user's email messages
async function fetchEmails() {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const res = await gmail.users.messages.list({ userId: 'me' });
    const messages = res.data.messages || [];
    return messages;
}

// Filter the email messages to identify the ones with no prior replies from the user
async function filterEmails(messages) {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const filteredMessages = [];
    for (const message of messages) {
        const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
        const threadId = msg.data.threadId;
        const headers = msg.data.payload.headers;
        const from = headers.find(h => h.name === 'From').value;
        const to = headers.find(h => h.name === 'To').value;
        const subject = headers.find(h => h.name === 'Subject').value;
        const hasReply = headers.some(h => h.name === 'In-Reply-To');
        if (!hasReply && to.includes('akashm.cs20@bmsce.ac.in')) {
            filteredMessages.push({ threadId, from, subject });
        }
    }
    return filteredMessages;
}

// Send a reply to each of the filtered email messages
async function sendReply(email) {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const message = `Hello Guys I am on Vacation will reply to you as soon as I return: ${email.subject}`;
    const raw = Buffer.from(`From: "Akash M" <akashm.cs20@bmsce.ac.in>\nTo: ${email.from}\nSubject: Re: ${email.subject}\n\n${message}`).toString('base64');
    const res = await gmail.users.messages.send({ userId: 'me', resource: { raw } });
    console.log(`Sent reply to email with subject: ${email.subject}`);
    return res.data;
}


async function addLabel(threadId) {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const labelName = 'autoemailreplies';
    let labelId = 'Label_3';
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels || [];
    const existingLabel = labels.find(l => l.name === labelName);
    if (existingLabel) {
        labelId = existingLabel.id;
    } else {
        const newLabel = await gmail.users.labels.create({ userId: 'me', requestBody: { name: labelName } });
        labelId = newLabel.data.id;
    }
    await gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { addLabelIds: [labelId] } });
    console.log(`Added label to thread with ID: ${threadId}`);
}

  // Main function to run the app
async function run() {
    await authorize();
    while (true) {
        try {
            const messages = await fetchEmails();
            const filteredMessages = await filterEmails(messages);
            for (const email of filteredMessages) {
                await sendReply(email);
                await addLabel(email.threadId);
            }
        } catch (error) {
            console.error(error);
        }
        const interval = Math.floor(Math.random() * (120 - 45 + 1) + 45);
        console.log(`Next check in ${interval} seconds...`);
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
}

  // Start the app
run();