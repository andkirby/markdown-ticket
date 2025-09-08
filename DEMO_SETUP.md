# Demo Setup for Dummies 🚀

A super simple guide to create a live demo of your Markdown Ticket Board on GitHub Pages.

## What You'll Get
- A live demo website that anyone can visit
- URL: `https://andkirby.github.io/markdown-ticket`
- Works on any device with internet

## Step-by-Step Instructions

### 1. Deploy to GitHub Pages
```bash
# Run this command in your project folder
npm run deploy
```

### 2. Enable GitHub Pages
1. Go to your GitHub repository: `https://github.com/andkirby/markdown-ticket`
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select "Deploy from a branch"
5. Under **Branch**, select `gh-pages`
6. Click **Save**

### 3. Wait & Visit
- Wait 2-5 minutes for GitHub to build your site
- Visit: `https://andkirby.github.io/markdown-ticket`
- 🎉 Your demo is live!

## Important Notes

⚠️ **Frontend Only**: This demo shows the UI but won't save real data (no backend server)

✅ **What Works**:
- Beautiful interface
- View switching (Board/List/Docs)
- Project selector
- Ticket viewing
- Dark/light mode

❌ **What Doesn't Work**:
- Creating new tickets
- Editing tickets
- Real project management

## For a Full Demo (Advanced)

If you want everything to work, consider:
- **Vercel**: Free, supports both frontend + backend
- **Netlify**: Similar to Vercel
- **Railway**: Full hosting with database

## Updating Your Demo

Whenever you make changes:
```bash
npm run deploy
```

Your demo will update automatically!

## Troubleshooting

**Demo not loading?**
- Check GitHub Pages settings
- Wait a few more minutes
- Try incognito/private browsing

**Want to remove the demo?**
- Go to Settings → Pages
- Select "None" under Source
