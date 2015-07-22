function test() {
  test1();
}

function test1() {
	console.log("Beginning test 1.");
  // 0 - Initializing:
  var pki = forge.pki;
  var rsa = forge.pki.rsa;
  var temp;
  
  //1 - Alice generate her keyPair:
  var alice = {};
  alice.pem = {};
  alice.passphrase = "Alice passphrase.";
    // 1.1 - Here I use a temp var because Alice would like to recreate her keyPair after:
  temp = rsa.generateKeyPair({bits: 2048, e: 0x10001});
  alice.pem.publicKey = pki.publicKeyToPem(temp.publicKey);
  alice.pem.privateKey = pki.encryptRsaPrivateKey(temp.privateKey, alice.passphrase);
  temp = null;
  
  console.log("alice.pem.publicKey", alice.pem.publicKey);
  console.log("alice.pem.privateKey", alice.pem.privateKey);

  //2 - Bob generate his keyPair too:
  var bob = {};
  bob.pem = {};
  bob.passphrase = "Bob passphrase.";
    //2.1 - Here I use a temp var because Bob would like to recreate his keyPair after:
  temp = rsa.generateKeyPair({bits: 2048, e: 0x10001});
  bob.pem.publicKey = pki.publicKeyToPem(temp.publicKey);
  bob.pem.privateKey = pki.encryptRsaPrivateKey(temp.privateKey, bob.passphrase);
  temp = null;
  
  console.log("bob.pem.publicKey", bob.pem.publicKey);
  console.log("bob.pem.privateKey", bob.pem.privateKey);
  
  //3 - Alice and Bob exchange their public keys (pem public keys are sent from internet).
  temp = bob.pem.publicKey; // Message from internet.
  alice.bob = {};
  alice.bob.publicKey = pki.publicKeyFromPem(temp);
  temp = alice.pem.publicKey; // Message from internet.
  bob.alice = {};
  bob.alice.publicKey = pki.publicKeyFromPem(temp);
  temp = null;
    
  //4 - Alice recreate her public and private keys from pem:
  alice.keyPair = {};
  alice.keyPair.publicKey = pki.publicKeyFromPem(alice.pem.publicKey);
  alice.keyPair.privateKey = pki.decryptRsaPrivateKey(alice.pem.privateKey, alice.passphrase);
  
  //5 - Bob recregate his public and private keys from pem too (to receive the message):
  bob.keyPair = {};
  bob.keyPair.publicKey = pki.publicKeyFromPem(bob.pem.publicKey);
  bob.keyPair.privateKey = pki.decryptRsaPrivateKey(bob.pem.privateKey, bob.passphrase);
  
  //6 - Alice generate a AES key:
  temp = {};
  alice.aes = {};
  alice.aes.bytes = {};
  alice.aes.bytes.key = forge.random.getBytesSync(24);
  alice.aes.bytes.iv = forge.random.getBytesSync(8);
  alice.aes.hex = {};
  alice.aes.hex.key = forge.util.bytesToHex(alice.aes.bytes.key);
  alice.aes.hex.iv = forge.util.bytesToHex(alice.aes.bytes.iv);
  alice.pem.aes = gserializer.serialize(alice.aes.hex);
  
  temp = null;
  console.log("alice.pem.aes", alice.pem.aes);
  
  //7 - Alice send the AES key (stored as pem) as a signed encrypted message to Bob over internet:
  temp = alice.pem.aes;
  temp = forge.util.createBuffer(temp, 'utf8');
  temp = temp.bytes();
  temp = alice.bob.publicKey.encrypt(temp);
  temp = {message: temp, signature: null};
  temp.signature = forge.md.sha1.create();
  temp.signature.update(temp.message, 'utf8');
  temp.signature = alice.keyPair.privateKey.sign(temp.signature);
  temp.message = forge.util.bytesToHex(temp.message);
  temp.signature = forge.util.bytesToHex(temp.signature);
  temp = gserializer.serialize(temp);
    //7.1 Now temp is sent to Bob.
  
  //8 - Bob receive de signed encrypted message, verify de signature and decrypt it.
  temp = gserializer.deserialize(temp);
  temp.message = forge.util.hexToBytes(temp.message);
  temp.signature = forge.util.hexToBytes(temp.signature);
  temp.md = forge.md.sha1.create();
  temp.md.update(temp.message, 'utf8');
  temp.verified = bob.alice.publicKey.verify(temp.md.digest().bytes(), temp.signature);
  if (temp.verified) {
    temp.message = bob.keyPair.privateKey.decrypt(temp.message);
  } else {
    throw Error("Unverified message.");
  }
  
  //9 - Bob recreate the AES key from pem:
  bob.pem.aes = temp.message;
  bob.aes = {};
  bob.aes.hex = gserializer.deserialize(bob.pem.aes);
  bob.aes.bytes = {};
  bob.aes.bytes.key = forge.util.hexToBytes(bob.aes.hex.key);
  bob.aes.bytes.iv = forge.util.hexToBytes(bob.aes.hex.iv);
  
  console.log("bob.pem.aes", bob.pem.aes);
  
  //10 - Bob send a message to Alice encrypted with the AES key:
  bob.aes.cipher = {};
  bob.aes.cipher = forge.cipher.createCipher('AES-CBC', bob.aes.bytes.key);
  bob.aes.cipher.start({
    iv: bob.aes.bytes.iv,
  });
  bob.aes.decipher = forge.cipher.createDecipher('AES-CBC', bob.aes.bytes.key);
  bob.aes.decipher.start({
    iv: bob.aes.bytes.iv
  });
   
  temp = "How are you Alice?";
  temp = forge.util.createBuffer(temp, 'utf8');
  
  bob.aes.cipher.update(temp);
  bob.aes.cipher.finish();
  temp = bob.aes.cipher.output;
  temp = {output: temp, buffer: forge.util.createBuffer()};
  temp.buffer.putBuffer(temp.output);
  temp = temp.buffer.getBytes();
  
  //11 - Alice decrypt the message sent by Bob encrypted with the AES key:
  alice.aes.cipher = {};
  alice.aes.cipher = forge.cipher.createCipher('AES-CBC', alice.aes.bytes.key);
  alice.aes.cipher.start({
    iv: alice.aes.bytes.iv,
  });
  alice.aes.decipher = forge.cipher.createDecipher('AES-CBC', alice.aes.bytes.key);
  alice.aes.decipher.start({
    iv: alice.aes.bytes.iv
  });
  
  temp = forge.util.createBuffer(temp);
  alice.aes.decipher.update(temp);
  alice.aes.decipher.finish();
  temp = alice.aes.decipher.output.getBytes();
  console.log("Alice received a message:", temp);
    
  //12 - Alice send a answer to Bob encrypted with the AES key:
  temp = "I'm fine Bob. And you?";
  temp = forge.util.createBuffer(temp, 'utf8');
  
  alice.aes.cipher.update(temp);
  alice.aes.cipher.finish();
  temp = alice.aes.cipher.output;
  temp = {output: temp, buffer: forge.util.createBuffer()};
  temp.buffer.putBuffer(temp.output);
  temp = temp.buffer.getBytes();
  
  //13 - Finally, Bob decrypt the message encrypted with the AES key:
  temp = forge.util.createBuffer(temp);
  bob.aes.decipher.update(temp);
  bob.aes.decipher.finish();
  temp = bob.aes.decipher.output.getBytes();
  console.log("Bob received a message:", temp);
  
  console.log("alice:", alice, "bob", bob);
  console.log("End of test 1.");
}