# Pregnancy Care Assistant 🤰

A beautiful, modern web application designed to assist expecting mothers with pregnancy-related questions and information through an AI-powered chatbot.

## Features

✨ **Beautiful UI Design**
- Pregnancy-themed color scheme with soft pink gradients
- Smooth animations and transitions
- Fully responsive design for all devices
- Modern, intuitive interface

🤖 **AI-Powered Chatbot**
- Integrated with Google Gemini AI
- Provides evidence-based pregnancy information
- Contextual responses about nutrition, exercise, baby development, and more
- Quick question buttons for common queries

📱 **Responsive Design**
- Works seamlessly on desktop, tablet, and mobile devices
- Adaptive chatbot interface
- Touch-friendly controls

💡 **Key Sections**
- Baby Development tracking
- Nutrition guidance
- Exercise tips
- Appointment reminders
- Daily quick tips

## Setup Instructions

### 1. Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for AI API calls)
- Google AI API key (already configured)

### 2. Installation

Simply open the `index.html` file in your web browser:

**Option 1: Double-click**
- Navigate to the project folder
- Double-click on `index.html`

**Option 2: Using a local server (recommended)**
```bash
# If you have Python installed:
python -m http.server 8000

# Then open: http://localhost:8000
```

**Option 3: Using VS Code Live Server**
- Install the "Live Server" extension in VS Code
- Right-click on `index.html`
- Select "Open with Live Server"

### 3. Using the Application

1. **Browse Information**: Scroll through the main page to see pregnancy care tips and information cards
2. **Open Chatbot**: Click the pink chat button in the bottom-right corner
3. **Ask Questions**: 
   - Type your question in the input field
   - Or click one of the quick question buttons
   - Press Enter or click the send button
4. **Get Responses**: The AI assistant will provide helpful, pregnancy-related information

## File Structure

```
chatbot/
│
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md          # This file
```

## Features Breakdown

### Main Page
- **Header**: Eye-catching title with animated heart icon
- **Info Cards**: Four key areas (Baby Development, Nutrition, Exercise, Appointments)
- **Quick Tips**: Daily helpful tips for pregnancy wellness

### Chatbot
- **Toggle Button**: Animated button with "Ask me anything!" badge
- **Chat Interface**: Clean, modern chat design
- **Quick Questions**: Pre-defined common questions
- **AI Responses**: Contextual, helpful responses from Google Gemini AI
- **Typing Indicator**: Visual feedback while AI is processing

## API Information

This application uses the **Google Gemini AI API** for generating intelligent responses.

- **Model**: gemini-pro
- **API Key**: Pre-configured in `script.js`
- **Safety Settings**: Enabled to ensure appropriate content

## Customization

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #ff9ec4;
    --secondary-color: #ffc4e1;
    --accent-color: #ff6b9d;
    /* ... */
}
```

### Modifying AI Behavior
Edit the `SYSTEM_CONTEXT` in `script.js` to adjust the chatbot's personality and guidelines.

### Adding Quick Questions
Add more quick question buttons in `index.html`:
```html
<button class="quick-question" data-question="Your question here">
    <i class="fas fa-icon"></i> Button Text
</button>
```

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## Important Notes

⚠️ **Medical Disclaimer**: This application provides general information only. Always consult with healthcare providers for personalized medical advice.

🔒 **API Key Security**: The API key is included for demonstration purposes. For production use, implement proper API key security measures.

🌐 **Internet Required**: The chatbot requires an active internet connection to communicate with the Google AI API.

## Troubleshooting

### Chatbot not responding?
- Check your internet connection
- Verify the API key is valid
- Check browser console for errors (F12)

### Styling issues?
- Clear browser cache
- Ensure all files are in the same directory
- Check that `styles.css` is properly linked

### Mobile display issues?
- Ensure viewport meta tag is present
- Test in different browsers
- Check responsive breakpoints in CSS

## Future Enhancements

Potential features to add:
- [ ] Pregnancy week calculator
- [ ] Appointment scheduling
- [ ] Nutrition tracker
- [ ] Exercise video library
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Chat history persistence
- [ ] User authentication

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify all files are present
3. Ensure internet connectivity
4. Test with a different browser

## Credits

- **Icons**: Font Awesome 6.4.0
- **AI**: Google Gemini AI
- **Design**: Custom pregnancy-themed design

## License

This project is created for educational and personal use.

---

Made with ❤️ for expecting mothers everywhere
