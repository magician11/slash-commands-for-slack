/* Sunbowl AI Firebase account */
const firebaseAdmin = require("firebase-admin");
const config = require("../security/auth.js").get(process.env.NODE_ENV);
const firebasePrivateKey = require(`../security/${config.firebase.privateKeyFilename}`);

class SunbowlFirebase {
  constructor() {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(firebasePrivateKey),
      databaseURL: config.firebase.databaseURL
    });

    this.db = firebaseAdmin.database();
  }

  writeObject(rootPosition, childNode, jsonObject) {
    const ref = this.db.ref(rootPosition);
    ref.child(childNode).set(jsonObject);
  }

  // update the object at the current location (without overwriting previous values)
  // https://firebase.google.com/docs/reference/node/firebase.database.Reference#update
  updateObject(rootPosition, childNode, jsonObject) {
    const ref = this.db.ref(rootPosition);
    ref.child(childNode).update(jsonObject);
  }

  readNode(rootNode) {
    return new Promise(resolve => {
      this.db.ref(rootNode).once("value", data => {
        resolve(data.val());
      });
    });
  }

  deleteNode(rootNode) {
    this.db.ref(rootNode).remove();
  }
}

module.exports = new SunbowlFirebase();
