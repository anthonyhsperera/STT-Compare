# Deployment Guide - Render.com

This guide will walk you through deploying the STT Compare application to Render.com.

## Prerequisites

1. A Render.com account (free tier available at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Speechmatics and Deepgram API keys (users can also enter their own via the UI)

## Deployment Steps

### Step 1: Push to GitHub

First, ensure your code is in a Git repository:

```bash
cd "/Users/anthonyp/Desktop/STT Compare"
git init
git add .
git commit -m "Initial commit - STT Compare application"
```

Create a new repository on GitHub and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/stt-compare.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Render

1. Log in to [Render.com](https://render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account if you haven't already
4. Select your `stt-compare` repository
5. Render will automatically detect the `render.yaml` file

### Step 3: Configure Environment Variables

Render will create two services based on `render.yaml`:

#### Backend Service (`stt-compare-api`)

After deployment, go to the backend service settings and add:

1. **FRONTEND_URL**: Set this to your frontend URL (you'll get this after frontend deploys)
   - Example: `https://stt-compare-frontend.onrender.com`
   - **Important**: No trailing slash!

#### Frontend Service (`stt-compare-frontend`)

After the backend deploys, go to frontend service settings and add:

1. **VITE_API_URL**: Set this to your backend URL
   - Example: `https://stt-compare-api.onrender.com`
   - **Important**: No trailing slash!

### Step 4: Deploy Order

1. **First deployment**: Both services will deploy, but may show errors initially
2. **After backend deploys**: Copy its URL (e.g., `https://stt-compare-api.onrender.com`)
3. **Update frontend env**: Add `VITE_API_URL` with backend URL → Trigger redeploy
4. **After frontend deploys**: Copy its URL (e.g., `https://stt-compare-frontend.onrender.com`)
5. **Update backend env**: Add `FRONTEND_URL` with frontend URL → Trigger redeploy

### Step 5: Update Service Names (Optional)

If you want to change the service names:

1. Go to each service's **Settings** page
2. Update the **Name** field
3. The URL will update automatically (e.g., `your-new-name.onrender.com`)

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FRONTEND_URL` | Yes (production) | Frontend URL for CORS | `https://stt-compare-frontend.onrender.com` |
| `PORT` | Auto-set | Port number (Render sets this) | `10000` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://stt-compare-api.onrender.com` |

## Post-Deployment

### Testing the Application

1. Visit your frontend URL (e.g., `https://stt-compare-frontend.onrender.com`)
2. Enter your Speechmatics and Deepgram API keys in the UI
3. Test with microphone input or BBC Radio stream

### Free Tier Limitations

Render's free tier includes:

- ✅ 750 hours/month free (enough for small teams)
- ⚠️ Services sleep after 15 minutes of inactivity
- ⚠️ First request after sleep takes ~30 seconds to wake up
- ✅ Automatic HTTPS
- ✅ Automatic deploys on git push

### Custom Domain (Optional)

To use your own domain:

1. Go to frontend service → **Settings** → **Custom Domain**
2. Add your domain (e.g., `stt.yourcompany.com`)
3. Update DNS records as instructed by Render
4. Update backend's `FRONTEND_URL` to your custom domain

## Troubleshooting

### CORS Errors

**Symptom**: "CORS policy blocked" errors in browser console

**Solution**:
1. Verify `FRONTEND_URL` in backend settings matches your frontend URL exactly
2. Ensure no trailing slash in the URL
3. Redeploy backend after changing env vars

### WebSocket Connection Failed

**Symptom**: "WebSocket connection error" in the UI

**Solution**:
1. Verify `VITE_API_URL` in frontend settings is correct
2. Ensure backend is running (check Render logs)
3. Verify backend URL uses `https://` (Render auto-provides SSL)

### Service Won't Start

**Symptom**: Service shows "Deploy failed" status

**Solution**:
1. Check the deployment logs in Render dashboard
2. Verify `requirements.txt` (backend) or `package.json` (frontend) has all dependencies
3. Ensure build commands in `render.yaml` are correct

### API Keys Not Working

**Symptom**: Transcription fails with API errors

**Solution**:
- Users must enter their own Speechmatics and Deepgram API keys via the UI
- API keys are stored in browser localStorage, not on the server
- Each user needs their own valid API keys

## Monitoring

### Viewing Logs

1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. Monitor real-time logs for errors

### Metrics

Render provides basic metrics:
- CPU usage
- Memory usage
- Request count
- Response times

Access via **"Metrics"** tab in each service.

## Updating the Application

After pushing code changes to GitHub:

1. Render auto-deploys on push to main branch
2. Or manually trigger deploy from Render dashboard
3. Monitor deployment logs to ensure success

## Cost Optimization

### Free Tier Tips

- Keep services on free tier for internal use
- Services auto-sleep after 15 minutes (saves resources)
- Consider upgrading to paid tier ($7/month per service) for:
  - No sleeping
  - Faster performance
  - More compute resources

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Speechmatics Docs**: https://docs.speechmatics.com
- **Deepgram Docs**: https://developers.deepgram.com

---

**Deployment complete!** 🚀 Share the frontend URL with your colleagues.
