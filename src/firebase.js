// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAMEjxjzSxtNdEJmeGOirRozTigbyDSdk",
  authDomain: "spelltype-bfdb2.firebaseapp.com",
  projectId: "spelltype-bfdb2",
  storageBucket: "spelltype-bfdb2.firebasestorage.app",
  messagingSenderId: "215754558160",
  appId: "1:215754558160:web:df981c4c311b11d4fbecd5",
  measurementId: "G-KK6Q2ZBGFW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);