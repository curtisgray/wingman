<p align="center">
  <img width="256" height="256" src="ux/assets/logo-rooster-black-white-512.png">
</p>
Wingman is a private ChatGPT interface for your PC. It combines Meta's Llama and OpenAI's GPT AI's into one interface, allowing you to change models mid conversation, and give real-time feedback to the AI.

---
Wingman - Rooster is the first release of Wingman. Future releases will be named after characters from the Top Gun franchise.
<p align="center">
  <img width="256" src="assets/images/rooster-flight-suit.webp">
</p>

---

## Wingman: The Easiest Way to Get AI on Your Desktop

Effortless AI Model Integration: Wingman provides a streamlined solution to bring advanced AI capabilities, specifically Meta’s Llama and OpenAI's GPT models, to your Windows or Mac environment. This integration bypasses the usual complexities of setup and configuration, making cutting-edge AI accessible without the need for extensive development tools or setup procedures.

Silk Tuning – Personalized AI Feedback Loop: At its core, Wingman employs an innovative feature called Silk Tuning. This mechanism enables users to rate AI responses in real-time, directly influencing the AI's learning process. The system then uses this feedback to generate a Learning Rate Adjustment (LoRA), which dynamically tailors the AI’s responses to align more closely with individual user preferences and interaction styles. This process of personalized adjustment occurs during periods of low activity on your PC, ensuring continuous improvement and customization of the AI experience.

Swift Switch – Dynamic Model Comparison: With Swift Switch, users gain the flexibility to switch between different AI models during a conversation. This feature is particularly useful for technical professionals and AI enthusiasts interested in observing and comparing the nuances of various AI models' responses. Whether it's transitioning from a high-capacity model like GPT-4 for in-depth, complex queries to a leaner model for efficiency, Swift Switch offers a practical tool for real-time performance evaluation and comparison.

Wingman is more than just an application; it's a gateway to a more accessible and tailored AI experience. By eliminating the barriers of complex AI integration and offering unique features for personalized and flexible interactions, Wingman stands as a valuable tool for those wanting to explore and utilize AI technologies with ease and efficiency.

### Wingman is under heavy development. Expect frequent updates.

## Progress Updates

- ✅ Add All GPT Models
- ✅ Duplicate existing conversations
- ✅ Add local Llama support (in progress)
- ✅ Download Llama models locally
- ⏳ Desktop app
- ⏳ Deploy to Windows Store and Mac App Store
- ✉️ Silk Tuning
- ✅ Swift Switch
- ✉️ Extend conversation beyond original context

**Legend**:
✅ Completed, ⏳ In Progress, ✉️ Not Started

## Requirements for Hardware and OS

- Windows 10+ or Mac OS X
- 2016 or newer CPU
- 16GB+ RAM
- 2016 or newer GPU with at least 3GB of RAM
- GPU not required, but recommended
- 100GB free disk space (for AI models)
- 1GB free disk space (for app)


## Installation

Note, an OpenAI API key is NOT needed, unless you want to run an OpenAI GPT-style model. Otherwise it is not needed. Wingman is designed to run without it.

Wingman will autodetect whether you have an OpenAI API key and make a GPT AI models available automatically.

### **Native Installers**

*Coming soon for Windows, Mac and Linux*

### **Build From Source**

See [Build Locally](#build-locally) for instructions on how to build Wingman locally.

#### Prerequisites

None


## Build Locally

**1. Clone Repo**

```bash
git clone https://github.com/curtisgray/wingman.git
```

**2. Build Front and Back Ends**


```powershell
build.ps1
```

**3. Provide OpenAI API Key**

Create a .env.local file in the root of the repo with your OpenAI API Key:

```bash
OPENAI_API_KEY=YOUR_KEY
```

> You can set `OPENAI_API_HOST` where access to the official OpenAI host is restricted or unavailable, allowing users to configure an alternative host for their specific needs.

> Additionally, if you have multiple OpenAI Organizations, you can set `OPENAI_ORGANIZATION` to specify one.

**4. Run App**

Windows:

- Select the Start button, and type `wingman`, then select Wingman from the list of results.

Mac:

- Open Finder and navigate to the Applications folder. Double-click Wingman.

**5. Use It**

You should be able to start chatting.

## Contact

If you have any questions reach out to Electric Curtis on [Twitter](https://twitter.com/electric_curtis).

## Acknowledgements

- UX is forked and modified from https://github.com/mckaywrigley/chatbot-ui
- Service uses the llama.cpp library at https://github.com/ggerganov/llama.cpp
