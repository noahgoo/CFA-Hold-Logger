# Chick-fil-A Button Logger

A simple web application for logging chicken item production at Chick-fil-A locations. The app tracks button presses for different chicken items and stores the data in Firebase Firestore for easy export to Google Sheets.

## Features

- **Simple Button Interface**: Large, touch-friendly buttons for each chicken item type
- **1-Minute Cooldown**: Prevents accidental double-presses with automatic cooldown
- **Real-time Logging**: Immediate feedback and Firebase integration
- **Recent Logs View**: Display the last 20 button presses with timestamps
- **Hawaii Time Zone**: All timestamps are recorded in Hawaii Standard Time (GMT-10)
- **Tablet Optimized**: Designed for single-tablet use in restaurant environments

## Button Types

- Nuggets
- Filets
- Spicy Filets
- Grilled Nuggets
- Grilled Filets
- Strips

## Tech Stack

- **Frontend**: React 18 with functional components
- **Styling**: Tailwind CSS with custom Chick-fil-A branding
- **Backend**: Firebase Firestore
- **Deployment**: Ready for static hosting (Netlify, Vercel, etc.)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Chickfila_Web_App
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Firestore Database
4. Go to Project Settings → General
5. Add a web app to your project
6. Copy the Firebase configuration

### 4. Environment Configuration

1. Copy the example environment file:

   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

### 5. Firestore Security Rules

Update your Firestore security rules to allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /button_presses/{document} {
      allow read, write: if true; // For production, consider more restrictive rules
    }
  }
}
```

### 6. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## Data Structure

Each button press creates a document in the `button_presses` collection with:

```javascript
{
  button_type: "Nuggets",           // String - the button that was pressed
  timestamp: "2025-01-15T18:34:00Z", // ISO 8601 string in Hawaii time
  created_at: Timestamp             // Firestore server timestamp
}
```

## Google Sheets Integration

To export data to Google Sheets, you can use:

1. **Google Apps Script**: Create a script that reads from Firestore and writes to Sheets
2. **Make.com (Integromat)**: Use the Firebase and Google Sheets connectors
3. **Zapier**: Create a zap between Firebase and Google Sheets

### Example Google Apps Script

```javascript
function exportFirebaseToSheets() {
  // This is a basic example - you'll need to implement the full Firebase connection
  const sheet = SpreadsheetApp.getActiveSheet();

  // Get data from Firebase (implement your own Firebase connection)
  const firebaseData = getFirebaseData();

  // Write to Google Sheets
  firebaseData.forEach((row) => {
    sheet.appendRow([row.timestamp, row.button_type]);
  });
}
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

## Customization

### Adding New Button Types

Edit `src/components/ButtonGrid.js` and add to the `BUTTON_TYPES` array:

```javascript
const BUTTON_TYPES = [
  "Nuggets",
  "Filets",
  "Spicy Filets",
  "Grilled Nuggets",
  "Grilled Filets",
  "Strips",
  "Your New Item", // Add here
];
```

### Changing Colors

Update the custom colors in `tailwind.config.js`:

```javascript
colors: {
  'chickfila-red': '#E60E33',    // Change this for different red
  'chickfila-white': '#FFFFFF',
}
```

## Troubleshooting

### Firebase Connection Issues

1. Check your `.env` file has all required variables
2. Verify Firestore is enabled in your Firebase project
3. Check Firestore security rules allow read/write access
4. Ensure your Firebase project is on the Blaze (pay-as-you-go) plan if needed

### Button Not Responding

1. Check browser console for JavaScript errors
2. Verify Firebase configuration is correct
3. Check if the button is in cooldown (1-minute wait period)

## Support

For issues or questions:

1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Firebase project is properly configured

## License

This project is for internal Chick-fil-A use only.
