const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api/lessons';

async function testUpload() {
    console.log("Starting upload test...");

    // Create a dummy file
    const dummyPath = path.join(__dirname, 'test-video.mp4');
    fs.writeFileSync(dummyPath, Buffer.alloc(10 * 1024 * 1024)); // 10MB dummy file
    console.log("Created 10MB dummy file at", dummyPath);

    const form = new FormData();
    form.append('course_id', '1'); // Assuming course 1 exists
    form.append('title', 'Test Lesson');
    form.append('content', 'Test Content');
    form.append('files', fs.createReadStream(dummyPath), 'test-video.mp4');

    try {
        console.log("Sending request to", API_URL);
        const response = await axios.post(API_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 30000  // 30s timeout
        });
        console.log("Success!", response.data);
    } catch (error) {
        console.error("Upload failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else if (error.request) {
            console.error("No response received (Network Error)");
            console.error(error.message);
        } else {
            console.error("Error setting up request:", error.message);
        }
    } finally {
        fs.unlinkSync(dummyPath);
    }
}

testUpload();
