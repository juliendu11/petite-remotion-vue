<img src="/resources/images/preview.png">

## Description

This project is a "small" (petite) copy of Remotion in Vue.js. For now, I’ve only tested it with TikTok-sized videos, but it should work with other dimensions by simply changing the width and height in the `App.vue` file of the `RootComposition` component.


You simply have to clone the project and modify mainly the `MyScene` component as you wish.

The project comes with a built-in example, it was a prototype TikTok video for one of my projects

## Structure

```
App.vue/
└── RootComposition.vue/
    └── MyScene.vue/
        ├── AudioSegment.vue (@/assets/sound.mp3)
        ├── VideoSegment.vue (@/assets/1.mp4) - hide after 5 seconds
        ├── VideoSegment.vue (@/assets/2.mp4) - show after 5 seconds
        └── VideoCaption.vue (@/assets/subtitles.json)
```

### `App.vue`

This is the main entry point of the application. It sets up the Vue instance and renders the `RootComposition` component. This is where you configure the duration, the width, the height, and the number of FPS.

### `RootComposition.vue` 

This is the main component that renders the video. You don’t need to change anything here. This is also the component that handles the preview system.

**Props:**

| Name     | Type   | Description                                | Default |
|----------|--------|--------------------------------------------|---------|
| width    | number | the width of the video                     | 1080    |
| height   | number | the height of the video                    | 1920    |
| duration | number | the total duration of the video in seconds |         |
| fps      | number | the number of frames per second            | 60      |


**Note:**

For the preview the video is scaled so that the video can be correctly

### `MyScene.vue` 

This is the component you can work on to set up the timeline of your video. In the current example, two videos play one after the other, along with an audio track.

### `VideoSegment.vue` 

Component that encapsulates the execution logic of a video, with the ability to define when it starts in relation to the global timeline, when it stops, and from which point it begins within the video.

**Props:**

| Name          | Type   | Description                                                     | Default |
|---------------|--------|-----------------------------------------------------------------|---------|
| src           | string | the path to the video file                                      |         |
| startTime     | number | At what second in the general timeline does the video appear    |         |
| endTime       | number | At what second in the general timeline does the video disappear |         |
| offsetInVideo | number | At what second in the video does the video start?               |         |

### `AudioSegment.vue` 

Same as VideoSegment, but for audio. This is only used for the preview. The audio is actually injected with FFmpeg during rendering, and for now, only a single audio track is supported.

### `VideoCaption.vue` 

Allows you to read and scroll subtitles from a file and based on timeline time.

You can configure the maximum number of words per paragraph to display.

**Props:**

| Name                 | Type     | Description                                                     | Default |
|----------------------|----------|-----------------------------------------------------------------|---------|
| captions             | object[] | The list of subtitles in format created by `tools/whisper.js`   |         |
| maxWordsByParagraphs | number   | The maximum number of words per paragraph to display            |         |

## How to generate subtitles?

Edit the `tools/whisper.js` file if necessary. If the source differs from `src/assets/sound.mp3`, update the `sourcePath` value.

Then, run the command npm run subtitles. A `src/assets/subtitles.json` file will be generated. This file is already used in the project if you haven’t modified it.

You can change the `max-words-by-paragraphs` property in `MyScene.vue` for the `VideoCaption` component.

## How to render the video?

To render the video, you need to run the command `npm run render`. This will generate a video file in the `out` directory. The rendering process uses FFmpeg, so make sure you have it installed on your system.

:warning: By default, the `src/assets/sound.mp3` file will be used as the audio source, the same one as in the `AudioSegment` component of `MyScene`. Adjust the code if necessary.

## :o: Limitations

- Only 1 audio track is supported for rendering.
- Tested only for Tiktok format
- Don't do everything Remotion does. I made this project for myself to generate TikTok videos for a project and I'm allergic to React.
- There are no prebuilt components for adding effects yet (they will be available soon). Using pure CSS effects is not a good idea, since the rendering is based on frame-by-frame generation. Effects need to be synchronized with the current frame in the same way as subtitles.
- Unlike Remotion, this project doesn’t provide a package and a command-generated template. You need to clone the project, which isn’t very convenient for maintaining and saving your work.