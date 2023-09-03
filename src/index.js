const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Scopes for Google Drive (you can modify this as needed)
const SCOPES = 'https://www.googleapis.com/auth/drive';

// Create a new OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI);

try {
    const creds = fs.readFileSync("creds.json");
    oauth2Client.setCredentials(JSON.parse(creds));
} catch (error) {
    console.log("No creds found");
}

app.get('/auth/google', (req, res) => {
    //    try {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/userinfo.profile",
            'https://www.googleapis.com/auth/drive']
    });
    res.redirect(url);
    //    } catch (error) {
    //     return res.status(500).json({message: error.message});
    //    }
})

app.get('/google/redirect', async (req, res) => {
    try {

        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync('creds.json', JSON.stringify(tokens));
        res.send('Success');
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})

app.get('/show/excel', async (req, res) => {
    try {

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const res = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder'",
            // q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",

            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
            // fields: 'nextPageToken, files(id, name)',
        });

        const files = res.data.files;

        console.log(files);
        if (files.length === 0) {
            console.log('No files found.');
            return;
        }

        // // console.log('Files:');
        const fileId = []
        await files.map((file) => {
            fileId.push(file.id);
            // console.log(file);
        });
        // console.log('fileId: ', fileId);
        await downloadFile(fileId[0]);


    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})

async function downloadFile(fileId) {
    // console.log('fileId', { fileId });
    // const dest = fs.createWriteStream(`downloaded-files.xlsx`);
    var res = [];

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.list({
        q: `'${fileId}' in parents`,

    });

    const file = response.data.files;
    console.log('file: ', file);
    downloadFileExcel(file[0].id)


    // const fileInfo = await drive.files.get({
    //     fileId: fileId,
    //     q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
    //     fields: 'id, name, mimeType, modifiedTime', // Specify the fields you want to retrieve
    // });

    // console.log('object', fileInfo.data);

    // res.push(fileInfo.data);

    // return new Promise((resolve, reject) => {
    //     fileInfo.data
    //         .on('end', () => {
    //             console.log(`File ${fileId} downloaded successfully.`);
    //             resolve();
    //         })
    //         .on('error', (err) => {
    //             console.error('Error downloading file:', err);
    //             reject(err);
    //         })
    //         .pipe(dest);
    // });




    // const drive = google.drive({ version: 'v3', auth: oauth2Client });
    // const dest = fs.createWriteStream(`downloaded-files.csv`); // Change the destination file name
    // await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' })
    //     .then((response) => {
    // return new Promise((resolve, reject) => {
    //     response.data
    //         .on('end', () => {
    //             console.log(`File ${fileId} downloaded successfully.`);
    //             resolve();
    //         })
    //         .on('error', (err) => {
    //             console.error('Error downloading file:', err);
    //             reject(err);
    //         })
    //         .pipe(dest);
    // });
    // res.send(response.data);
    // console.log(response.data);
    // response.data
    //     .on('end', () => {
    //         console.log(`File ${fileId} downloaded successfully.`);
    //     })
    //     .on('error', (err) => {
    //         console.error('Error downloading file:', err);
    //     })
    //     .pipe(dest);
    // });
}

async function downloadFileExcel(fileId) {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
    const response = await drive.files.get({ fileId, alt: 'media' }, {responseType: 'stream' });
    const fileContent = response.data;

    // Replace 'downloaded-files.xlsx' with the desired destination path and file name
    const destinationPath = 'downloaded-files.xlsx';

    // fs.createWriteStream(destinationPath, fileContent);
    const writeStream = fs.createWriteStream(destinationPath);
    response.data.pipe(writeStream);

    console.log(`File ${fileId} downloaded successfully.`);

     
  }

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


