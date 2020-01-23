const zipFolder = require('zip-folder');
const fs = require('fs');
const path = require('path');
const credentials = require('./credentials.json');

const workingDir = './app/';
const zipDir = './tmp/';
const zipName = 'todo_extension.zip';

const webStore = require('chrome-webstore-upload')({
    extensionId: credentials.extensionId,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken
});

const deploy = () => {
    createTmpFolder();
    zipFolder(workingDir, zipDir + zipName, async err => {
        if (err) {
            console.log('oh no! ', err);
        } else {
            console.log(`Successfully zipped the ${workingDir} directory and store as ${zipName}`);
            const token = await webStore.fetchToken();
            console.log('token', token);
            const uploadResult = await upload(token);
            removeTmpFolder();
        }
    });
}

const createTmpFolder = () => {
    const dir = zipDir;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

const removeTmpFolder = () => {
    if (fs.existsSync(zipDir)) {
        console.log('located zip directory');
        fs.readdirSync(zipDir).forEach((file, index) => {
            const curPath = path.join(zipDir, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(zipDir);
    }
};

const upload = token => {
    return new Promise((resolve, reject) => {
        const myZipFile = fs.createReadStream(`${zipDir}${zipName}`);
        webStore.uploadExisting(myZipFile, token).then(res => {
            // Response is a Resource Representation
            // https://developer.chrome.com/webstore/webstore_api/items#resource 
            console.log('response to upload', res);
            // publish the uploaded zip
            webStore.publish(token).then(res => {
                console.log('Successfully published the newer version');
                resolve(res);
            }).catch((error) => {
                console.log(`Error while publishing uploaded extension: ${error}`);
                reject(error);
            });
        }).catch(error => {
            console.log(`Error while uploading ZIP: ${error}`);
            reject(error);
        });
    });
}
deploy();