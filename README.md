<p align="center">
  <img width="256" height="256" src="ux/assets/logo-color.png">
</p>
Wingman is an open-source, cross-platform AI chatbot with an easy-to-use interface for running AI models locally. You can download models like Meta’s Llama 2, Mistral and phi 2 from Hugging Face directly in the app. It runs on Windows (Nvidia GPUs or CPU-based) and MacOS (Intel and Apple Silicon). 

---
Wingman - Rooster is the first release of Wingman. Future releases will be named after characters from the Top Gun franchise.
<p align="center">
  <img width="256" src="assets/images/rooster-flight-suit.webp">
</p>

---

[![Watch the video](https://img.youtube.com/vi/BTFclfbUDso/0.jpg)](https://youtu.be/BTFclfbUDso)

![1](https://github.com/SaltyLightning/bee_scraper/assets/23483154/3888e991-1943-4d6d-bf79-cb7783896c27)
![2](https://github.com/SaltyLightning/bee_scraper/assets/23483154/d0f174e9-0425-42e2-bdb1-0c7a21c7cd0f)
![3](https://github.com/SaltyLightning/bee_scraper/assets/23483154/9fddf12c-d723-407f-824a-0f4d4d9ac805)
![4](https://github.com/SaltyLightning/bee_scraper/assets/23483154/4d5d9edf-acb9-478c-95f6-19c93347dc3e)

---

## Features
-	Easy to use UI with no terminals and no code required.
-	Runs on Windows and Mac (Intel or Apple Silicon).
-	It’s a free, open-source app.
-	Run Large Language Models (LLMs) like Meta’s Llama 2, Mistral, Yi, Microsoft’s phi 2, OpenAI, zephyr and more all in the same app with a familiar chatbot interface.
-	Quick access to LLMs from Hugging Face right inside the app. You can even see what’s popular or trending.
-	Swift Switch: Quickly swap between models mid-conversation for the best results. 
-	Private by design: the LLMs all run on your machine, so you can keep your chats private.
-	Wingman will evaluate your machine so you can see at a glance what models may or may not run on your hardware. We won’t stop you from trying any of them, though!
-	Save and organize your chats into folders so you can find them again later. 
-	Set system prompts and prompt templates so you can talk with characters and get the best results from all models.
## Planned Features
**Silk Tuning** – Personalized AI Feedback Loop: At its core, Wingman employs an innovative feature called Silk Tuning. This mechanism enables users to rate AI responses in real-time, directly influencing the AI's learning process. The system then uses this feedback to generate a Learning Rate Adjustment (LoRA), which dynamically tailors the AI’s responses to align more closely with individual user preferences and interaction styles. This process of personalized adjustment occurs during periods of low activity on your PC, ensuring continuous improvement and customization of the AI experience.

**Flight Formation** - Collaborative AI Optimization: Wingman's Flight Formation unlocks the power of community-driven AI model enhancement. Users can rate responses, share optimized prompts and prompt templates, and contribute to a growing repository of knowledge. This collective wisdom improves model outputs, tailoring them to deliver more accurate and relevant results. Flight Formation creates a feedback loop that allows AI models to continuously learn and adapt, ensuring its capabilities soar to new heights through the combined efforts of the Wingman community.

**Airborne Server** - Take to the Cloud: With Airborne Server, users can deploy their own private Wingman instance on cloud infrastructure or an external server. This innovative feature provides enhanced control, scalability, and customization options. Whether running resource-intensive models, handling sensitive data, or integrating with existing systems, Airborne Server empowers users to take flight with Wingman's capabilities in their own secure, tailored environment.

**Genius Primer** - Unlock Model Potential: Genius Primer is a groundbreaking feature that amplifies the capabilities of smaller language models, transforming them into high-performing AI powerhouses. By leveraging advanced priming techniques, Genius Primer equips modest models with knowledge and contextual understanding far beyond their natural capacity. This cutting-edge technology opens up new realms of possibility, enabling users to harness the full potential of AI without the need for resource-intensive, large-scale models.

**Radar Enrichment** - Contextualize External Sources: Wingman's Radar Enrichment unlocks new levels of AI awareness by contextualizing external documents and multimedia directly into your conversations. Whether incorporating PDFs, text files, images, or YouTube videos, this powerful feature allows any open-source model to build upon the insights and knowledge contained within auxiliary sources. With Radar Enrichment, you can simply paste links or upload files, and the AI will ingest and synthesize that supplementary information to produce outputs backed by an enriched, multifaceted context. Expand your AI's perspective by providing access to external documents and media.

**Super Context** - Defy Context Limitations: Shatter the constraints of traditional context windows with Wingman's Super Context capability. This innovative feature exponentially extends any model's maximum context length, empowering even smaller, lower-capacity models to build upon a vastly expanded knowledge base. By dynamically increasing the conversational context far beyond natural bounds, Super Context facilitates generation of coherent, substantive outputs that seamlessly combine information across broad timelines and subject areas. Unlock new frontiers of hyper-aware AI outputs backed by comprehensive, contextualized understanding that defies ordinary context limitations.


Wingman is more than just an application; it's a gateway to a more accessible and tailored AI experience. By eliminating the barriers of complex AI integration and offering unique features for personalized and flexible interactions, Wingman stands as a valuable tool for those wanting to explore and utilize AI technologies with ease and efficiency.

### Wingman is under heavy development. Expect frequent updates.

## Progress Updates

- ✅ Add All GPT Models
- ✅ Duplicate existing conversations
- ✅ Add local Llama support (in progress)
- ✅ Download Llama models locally
- ⏳ Desktop app <- (will be out in the next week!)
- ⏳ Deploy to Windows Store and Mac App Store
- ✉️ Silk Tuning
- ✅ Swift Switch
- ⏳ Radar Enrichment
- ⏳ Airborne Server
- ✉️ Super Context
- ✉️ Genius Primer
- ✉️ Flight Formation


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
