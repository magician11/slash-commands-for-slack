/* Sunbowl AI Firebase account */
const firebaseAdmin = require('firebase-admin');
const firebasePrivateKey = require('../sunbowl-ai-firebase-adminsdk-n05vi-72b612beb0.json');

class SunbowlFirebase {
  constructor() {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(firebasePrivateKey),
      databaseURL: 'https://sunbowl-ai.firebaseio.com/'
    });

    this.db = firebaseAdmin.database();
  }

  writeObject(rootPosition, childNode, jsonObject) {
    const ref = this.db.ref(rootPosition);
    ref.child(childNode).set(jsonObject);
  }

  readNode(rootNode) {
    return new Promise(resolve => {
      this.db.ref(rootNode).once('value', data => {
        resolve(data);
      });
    });
  }

  deleteNode(rootNode) {
    this.db.ref(rootNode).remove();
  }
}

module.exports = new SunbowlFirebase();
