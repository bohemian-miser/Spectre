// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class MediaElement extends Element {
    constructor(elt: string);

  /**
   * Plays audio or video from a media element.
   */
  play(): void;

  /**
   * Stops a media element and sets its current time to 0.Calling `media.play()` will restart playing audio/video from the beginning.
   */
  stop(): void;

  /**
   * Pauses a media element.Calling `media.play()` will resume playing audio/video from the moment it paused.
   */
  pause(): void;

  /**
   * Plays the audio/video repeatedly in a loop.
   */
  loop(): void;

  /**
   * Stops the audio/video from playing in a loop.The media will stop when it finishes playing.
   */
  noLoop(): void;

  /**
   * Sets the audio/video to play once it's loaded.The parameter, `shouldAutoplay`, is optional. Calling
   * `media.autoplay()` without an argument causes the media to play
   * automatically. If `true` is passed, as in `media.autoplay(true)`, the
   * media will automatically play. If `false` is passed, as in
   * `media.autoPlay(false)`, it won't play automatically.
 *
   * @param
   * @param
   */
  autoplay(val: any, shouldAutoplay: boolean): void;

  /**
   * Sets the audio/video volume.Calling `media.volume()` without an argument returns the current volume
   * as a number in the range 0 (off) to 1 (maximum).The parameter, `val`, is optional. It's a number that sets the volume
   * from 0 (off) to 1 (maximum). For example, calling `media.volume(0.5)`
   * sets the volume to half of its maximum.
 *
   * @param
   */
  volume(val: any): number;

  volume(val: number): void;

  /**
   * Sets the audio/video playback speed.The parameter, `val`, is optional. It's a number that sets the playback
   * speed. 1 plays the media at normal speed, 0.5 plays it at half speed, 2
   * plays it at double speed, and so on. -1 plays the media at normal speed
   * in reverse.Calling `media.speed()` returns the current speed as a number.Note: Not all browsers support backward playback. Even if they do,
   * playback might not be smooth.
 *
   * @param
   */
  speed(val: any): number;

  speed(val: any, speed: number): void;

  /**
   * Sets the media element's playback time.The parameter, `time`, is optional. It's a number that specifies the
   * time, in seconds, to jump to when playback begins.Calling `media.time()` without an argument returns the number of seconds
   * the audio/video has played.Note: Time resets to 0 when looping media restarts.
 *
   * @param
   */
  time(val: any): number;

  time(val: any, time: number): void;

  /**
   * Returns the audio/video's duration in seconds.
   */
  duration(): number;

  /**
   * Calls a function when the audio/video reaches the end of its playback.The element is passed as an argument to the callback function.Note: The function won't be called if the media is looping.
 *
   * @param
   */
  onended(callback: Function): void;

  /**
   * Sends the element's audio to an output.The parameter, `audioNode`, can be an `AudioNode` or an object from the
   * `p5.sound` library.If no element is provided, as in `myElement.connect()`, the element
   * connects to the main output. All connections are removed by the
   * `.disconnect()` method.Note: This method is meant to be used with the p5.sound.js addon library.
 *
   * @param
   * @param
   */
  connect(obj: any, audioNode: AudioNode | object): void;

  /**
   * Disconnect all Web Audio routing, including to the main output.This is useful if you want to re-route the output through audio effects,
   * for example.
   */
  disconnect(): void;

  /**
   * Show the default
   * HTMLMediaElement
   * controls.Note: The controls vary between web browsers.
   */
  showControls(): void;

  /**
   * Hide the default
   * HTMLMediaElement
   * controls.
   */
  hideControls(): void;

  /**
   * Schedules a function to call when the audio/video reaches a specific time
   * during its playback.The first parameter, `time`, is the time, in seconds, when the function
   * should run. This value is passed to `callback` as its first argument.The second parameter, `callback`, is the function to call at the specified
   * cue time.The third parameter, `value`, is optional and can be any type of value.
   * `value` is passed to `callback`.Calling `media.addCue()` returns an ID as a string. This is useful for
   * removing the cue later.
 *
   * @param
   * @param
   * @param
   * @param
   */
  addCue(time: number, callback: Function, val: any, value: object): number;

  /**
   * Removes a callback based on its ID.
 *
   * @param
   */
  removeCue(id: number): void;

  /**
   * Removes all functions scheduled with `media.addCue()`.
   */
  clearCues(): void;

  }

/**
 * Creates a `&lt;video&gt;` element for simple audio/video playback.`createVideo()` returns a new
 * p5.MediaElement object. Videos are shown by
 * default. They can be hidden by calling `video.hide()` and drawn to the
 * canvas using image().The first parameter, `src`, is the path the video. If a single string is
 * passed, as in `'assets/topsecret.mp4'`, a single video is loaded. An array
 * of strings can be used to load the same video in different formats. For
 * example, `['assets/topsecret.mp4', 'assets/topsecret.ogv', 'assets/topsecret.webm']`.
 * This is useful for ensuring that the video can play across different browsers with
 * different capabilities. See
 * MDN
 * for more information about supported formats.The second parameter, `callback`, is optional. It's a function to call once
 * the video is ready to play.
 *
 * @param path to a video file, or an array of paths for
 * supporting different browsers.
 * @param function to call once the video is ready to play.
 * @return new <a href="#/p5.MediaElement">p5.MediaElement</a> object.
 * @example <div class='notest'>
 * <code>
 * function setup() {
 * noCanvas();
 * 
 * // Load a video and add it to the page.
 * // Note: this may not work in some browsers.
 * let video = createVideo('assets/small.mp4');
 * 
 * // Show the default video controls.
 * video.showControls();
 * 
 * describe('A video of a toy robot with playback controls beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * function setup() {
 * noCanvas();
 * 
 * // Load a video and add it to the page.
 * // Provide an array options for different file formats.
 * let video = createVideo(
 * ['assets/small.mp4', 'assets/small.ogv', 'assets/small.webm']
 * );
 * 
 * // Show the default video controls.
 * video.showControls();
 * 
 * describe('A video of a toy robot with playback controls beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * let video;
 * 
 * function setup() {
 * noCanvas();
 * 
 * // Load a video and add it to the page.
 * // Provide an array options for different file formats.
 * // Call mute() once the video loads.
 * video = createVideo(
 * ['assets/small.mp4', 'assets/small.ogv', 'assets/small.webm'],
 * muteVideo
 * );
 * 
 * // Show the default video controls.
 * video.showControls();
 * 
 * describe('A video of a toy robot with playback controls beneath it.');
 * }
 * 
 * // Mute the video once it loads.
 * function muteVideo() {
 * video.volume(0);
 * }
 * </code>
 * </div>
 */
function createVideo(src: string | string[], callback?: Function): p5.MediaElement;

/**
 * AUDIO STUFF *
 *
 */
function createAudio(src: any, callback: any): void;

/**
 * Creates a hidden `&lt;audio&gt;` element for simple audio playback.`createAudio()` returns a new
 * p5.MediaElement object.The first parameter, `src`, is the path the video. If a single string is
 * passed, as in `'assets/video.mp4'`, a single video is loaded. An array
 * of strings can be used to load the same video in different formats. For
 * example, `['assets/video.mp4', 'assets/video.ogv', 'assets/video.webm']`.
 * This is useful for ensuring that the video can play across different
 * browsers with different capabilities. See
 * MDN
 * for more information about supported formats.The second parameter, `callback`, is optional. It's a function to call once
 * the audio is ready to play.
 *
 * @param path to an audio file, or an array of paths
 * for supporting different browsers.
 * @param function to call once the audio is ready to play.
 * @return new <a href="#/p5.MediaElement">p5.MediaElement</a> object.
 * @example <div class='notest'>
 * <code>
 * function setup() {
 * noCanvas();
 * 
 * // Load the audio.
 * let beat = createAudio('assets/beat.mp3');
 * 
 * // Show the default audio controls.
 * beat.showControls();
 * 
 * describe('An audio beat plays when the user double-clicks the square.');
 * }
 * </code>
 * </div>
 */
function createAudio(src?: string | string[], callback?: Function): p5.MediaElement;

/**
 * Creates a `&lt;video&gt;` element that "captures" the audio/video stream from
 * the webcam and microphone.`createCapture()` returns a new
 * p5.MediaElement object. Videos are shown by
 * default. They can be hidden by calling `capture.hide()` and drawn to the
 * canvas using image().The first parameter, `type`, is optional. It sets the type of capture to
 * use. By default, `createCapture()` captures both audio and video. If `VIDEO`
 * is passed, as in `createCapture(VIDEO)`, only video will be captured.
 * If `AUDIO` is passed, as in `createCapture(AUDIO)`, only audio will be
 * captured. A constraints object can also be passed to customize the stream.
 * See the
 * W3C documentation for possible properties. Different browsers support different
 * properties.The 'flipped' property is an optional property which can be set to `{flipped:true}`
 * to mirror the video output.If it is true then it means that video will be mirrored
 * or flipped and if nothing is mentioned then by default it will be `false`.The second parameter,`callback`, is optional. It's a function to call once
 * the capture is ready for use. The callback function should have one
 * parameter, `stream`, that's a
 * MediaStream object.Note: `createCapture()` only works when running a sketch locally or using HTTPS. Learn more
 * here
 * and here.
 *
 * @param type of capture, either AUDIO or VIDEO,
 * or a constraints object. Both video and audio
 * audio streams are captured by default.
 * @param flip the capturing video and mirror the output with `{flipped:true}`. By
 * default it is false.
 * @param function to call once the stream
 * has loaded.
 * @return new <a href="#/p5.MediaElement">p5.MediaElement</a> object.
 * @example <div class='notest'>
 * <code>
 * function setup() {
 * noCanvas();
 * 
 * // Create the video capture.
 * createCapture(VIDEO);
 * 
 * describe('A video stream from the webcam.');
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * let capture;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create the video capture and hide the element.
 * capture = createCapture(VIDEO);
 * capture.hide();
 * 
 * describe('A video stream from the webcam with inverted colors.');
 * }
 * 
 * function draw() {
 * // Draw the video capture within the canvas.
 * image(capture, 0, 0, width, width * capture.height / capture.width);
 * 
 * // Invert the colors in the stream.
 * filter(INVERT);
 * }
 * </code>
 * </div>
 * <div class='notest'>
 * <code>
 * let capture;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create the video capture with mirrored output.
 * capture = createCapture(VIDEO,{ flipped:true });
 * capture.size(100,100);
 * 
 * describe('A video stream from the webcam with flipped or mirrored output.');
 * }
 * 
 * </code>
 * </div>
 * 
 * <div class='notest norender'>
 * <code>
 * function setup() {
 * createCanvas(480, 120);
 * 
 * // Create a constraints object.
 * let constraints = {
 * video: {
 * mandatory: {
 * minWidth: 1280,
 * minHeight: 720
 * },
 * optional: [{ maxFrameRate: 10 }]
 * },
 * audio: false
 * };
 * 
 * // Create the video capture.
 * createCapture(constraints);
 * 
 * describe('A video stream from the webcam.');
 * }
 * </code>
 * </div>
 */
function createCapture(...args: any[], type?: AUDIO | VIDEO | object, flipped?: object, callback?: Function): p5.MediaElement;

/**
 * Helpers for create methods.
 *
 */
function addElement(elt: any, pInst: any, media: any): void;

/**
 * Plays audio or video from a media element.
 *
 * @example <div>
 * <code>
 * let beat;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display a message.
 * text('Click to play', 50, 50);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * describe('The text "Click to play" written in black on a gray background. A beat plays when the user clicks the square.');
 * }
 * 
 * // Play the beat when the user presses the mouse.
 * function mousePressed() {
 * beat.play();
 * }
 * </code>
 * </div>
 */
function play(): void;

/**
 * Stops a media element and sets its current time to 0.Calling `media.play()` will restart playing audio/video from the beginning.
 *
 * @example <div>
 * <code>
 * let beat;
 * let isStopped = true;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * describe('The text "Click to start" written in black on a gray background. The beat starts or stops when the user presses the mouse.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display different instructions based on playback.
 * if (isStopped === true) {
 * text('Click to start', 50, 50);
 * } else {
 * text('Click to stop', 50, 50);
 * }
 * }
 * 
 * // Adjust playback when the user presses the mouse.
 * function mousePressed() {
 * if (isStopped === true) {
 * // If the beat is stopped, play it.
 * beat.play();
 * isStopped = false;
 * } else {
 * // If the beat is playing, stop it.
 * beat.stop();
 * isStopped = true;
 * }
 * }
 * </code>
 * </div>
 */
function stop(): void;

/**
 * Pauses a media element.Calling `media.play()` will resume playing audio/video from the moment it paused.
 *
 * @example <div>
 * <code>
 * let beat;
 * let isPaused = true;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * describe('The text "Click to play" written in black on a gray background. The beat plays or pauses when the user clicks the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display different instructions based on playback.
 * if (isPaused === true) {
 * text('Click to play', 50, 50);
 * } else {
 * text('Click to pause', 50, 50);
 * }
 * }
 * 
 * // Adjust playback when the user presses the mouse.
 * function mousePressed() {
 * if (isPaused === true) {
 * // If the beat is paused,
 * // play it.
 * beat.play();
 * isPaused = false;
 * } else {
 * // If the beat is playing,
 * // pause it.
 * beat.pause();
 * isPaused = true;
 * }
 * }
 * </code>
 * </div>
 */
function pause(): void;

/**
 * Plays the audio/video repeatedly in a loop.
 *
 * @example <div>
 * <code>
 * let beat;
 * let isLooping = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * describe('The text "Click to loop" written in black on a gray background. A beat plays repeatedly in a loop when the user clicks. The beat stops when the user clicks again.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display different instructions based on playback.
 * if (isLooping === true) {
 * text('Click to stop', 50, 50);
 * } else {
 * text('Click to loop', 50, 50);
 * }
 * }
 * 
 * // Adjust playback when the user presses the mouse.
 * function mousePressed() {
 * if (isLooping === true) {
 * // If the beat is looping, stop it.
 * beat.stop();
 * isLooping = false;
 * } else {
 * // If the beat is stopped, loop it.
 * beat.loop();
 * isLooping = true;
 * }
 * }
 * </code>
 * </div>
 */
function loop(): void;

/**
 * Stops the audio/video from playing in a loop.The media will stop when it finishes playing.
 *
 * @example <div>
 * <code>
 * let beat;
 * let isPlaying = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * describe('The text "Click to play" written in black on a gray background. A beat plays when the user clicks. The beat stops when the user clicks again.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display different instructions based on playback.
 * if (isPlaying === true) {
 * text('Click to stop', 50, 50);
 * } else {
 * text('Click to play', 50, 50);
 * }
 * }
 * 
 * // Adjust playback when the user presses the mouse.
 * function mousePressed() {
 * if (isPlaying === true) {
 * // If the beat is playing, stop it.
 * beat.stop();
 * isPlaying = false;
 * } else {
 * // If the beat is stopped, play it.
 * beat.play();
 * isPlaying = true;
 * }
 * }
 * </code>
 * </div>
 */
function noLoop(): void;

/**
 * Sets the audio/video to play once it's loaded.The parameter, `shouldAutoplay`, is optional. Calling
 * `media.autoplay()` without an argument causes the media to play
 * automatically. If `true` is passed, as in `media.autoplay(true)`, the
 * media will automatically play. If `false` is passed, as in
 * `media.autoPlay(false)`, it won't play automatically.
 *
 * @param whether the element should autoplay.
 * @example <div class='notest'>
 * <code>
 * let video;
 * 
 * function setup() {
 * noCanvas();
 * 
 * // Call handleVideo() once the video loads.
 * video = createVideo('assets/fingers.mov', handleVideo);
 * 
 * describe('A video of fingers walking on a treadmill.');
 * }
 * 
 * // Set the video's size and play it.
 * function handleVideo() {
 * video.size(100, 100);
 * video.autoplay();
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * function setup() {
 * noCanvas();
 * 
 * // Load a video, but don't play it automatically.
 * let video = createVideo('assets/fingers.mov', handleVideo);
 * 
 * // Play the video when the user clicks on it.
 * video.mousePressed(handlePress);
 * 
 * describe('An image of fingers on a treadmill. They start walking when the user double-clicks on them.');
 * }
 * </code>
 * </div>
 * 
 * // Set the video's size and playback mode.
 * function handleVideo() {
 * video.size(100, 100);
 * video.autoplay(false);
 * }
 * 
 * // Play the video.
 * function handleClick() {
 * video.play();
 * }
 */
function autoplay(val: any, shouldAutoplay?: boolean): void;

/**
 * Sets the audio/video volume.Calling `media.volume()` without an argument returns the current volume
 * as a number in the range 0 (off) to 1 (maximum).The parameter, `val`, is optional. It's a number that sets the volume
 * from 0 (off) to 1 (maximum). For example, calling `media.volume(0.5)`
 * sets the volume to half of its maximum.
 *
 * @return current volume.
 * @example <div>
 * <code>
 * let dragon;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('The text "Volume: V" on a gray square with media controls beneath it. The number "V" oscillates between 0 and 1 as the music plays.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Produce a number between 0 and 1.
 * let n = 0.5 * sin(frameCount * 0.01) + 0.5;
 * 
 * // Use n to set the volume.
 * dragon.volume(n);
 * 
 * // Get the current volume and display it.
 * let v = dragon.volume();
 * 
 * // Round v to 1 decimal place for display.
 * v = round(v, 1);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the volume.
 * text(`Volume: ${v}`, 50, 50);
 * }
 * </code>
 * </div>
 */
function volume(val: any): number;

/**
 * @param volume between 0.0 and 1.0.
 */
function volume(val: number): void;

/**
 * Sets the audio/video playback speed.The parameter, `val`, is optional. It's a number that sets the playback
 * speed. 1 plays the media at normal speed, 0.5 plays it at half speed, 2
 * plays it at double speed, and so on. -1 plays the media at normal speed
 * in reverse.Calling `media.speed()` returns the current speed as a number.Note: Not all browsers support backward playback. Even if they do,
 * playback might not be smooth.
 *
 * @return current playback speed.
 * @example <div>
 * <code>
 * let dragon;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('The text "Speed: S" on a gray square with media controls beneath it. The number "S" oscillates between 0 and 1 as the music plays.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Produce a number between 0 and 2.
 * let n = sin(frameCount * 0.01) + 1;
 * 
 * // Use n to set the playback speed.
 * dragon.speed(n);
 * 
 * // Get the current speed and display it.
 * let s = dragon.speed();
 * 
 * // Round s to 1 decimal place for display.
 * s = round(s, 1);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the speed.
 * text(`Speed: ${s}`, 50, 50);
 * }
 * </code>
 */
function speed(val: any): number;

/**
 * @param speed multiplier for playback.
 */
function speed(val: any, speed: number): void;

/**
 * Sets the media element's playback time.The parameter, `time`, is optional. It's a number that specifies the
 * time, in seconds, to jump to when playback begins.Calling `media.time()` without an argument returns the number of seconds
 * the audio/video has played.Note: Time resets to 0 when looping media restarts.
 *
 * @return current time (in seconds).
 * @example <div>
 * <code>
 * let dragon;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('The text "S seconds" on a gray square with media controls beneath it. The number "S" increases as the song plays.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Get the current playback time.
 * let s = dragon.time();
 * 
 * // Round s to 1 decimal place for display.
 * s = round(s, 1);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the playback time.
 * text(`${s} seconds`, 50, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let dragon;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * // Jump to 2 seconds to start.
 * dragon.time(2);
 * 
 * describe('The text "S seconds" on a gray square with media controls beneath it. The number "S" increases as the song plays.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Get the current playback time.
 * let s = dragon.time();
 * 
 * // Round s to 1 decimal place for display.
 * s = round(s, 1);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the playback time.
 * text(`${s} seconds`, 50, 50);
 * }
 * </code>
 * </div>
 */
function time(val: any): number;

/**
 * @param time to jump to (in seconds).
 */
function time(val: any, time: number): void;

/**
 * Returns the audio/video's duration in seconds.
 *
 * @return duration (in seconds).
 * @example <div>
 * <code>
 * let dragon;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('The text "S seconds left" on a gray square with media controls beneath it. The number "S" decreases as the song plays.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the time remaining.
 * let s = dragon.duration() - dragon.time();
 * 
 * // Round s to 1 decimal place for display.
 * s = round(s, 1);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the time remaining.
 * text(`${s} seconds left`, 50, 50);
 * }
 * </code>
 * </div>
 */
function duration(): number;

/**
 * Calls a function when the audio/video reaches the end of its playback.The element is passed as an argument to the callback function.Note: The function won't be called if the media is looping.
 *
 * @param function to call when playback ends.
 * The `p5.MediaElement` is passed as
 * the argument.
 * @example <div>
 * <code>
 * let beat;
 * let isPlaying = false;
 * let isDone = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * beat = createAudio('assets/beat.mp3');
 * 
 * // Call handleEnd() when the beat finishes.
 * beat.onended(handleEnd);
 * 
 * describe('The text "Click to play" written in black on a gray square. A beat plays when the user clicks. The text "Done!" appears when the beat finishes playing.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display different messages based on playback.
 * if (isDone === true) {
 * text('Done!', 50, 50);
 * } else if (isPlaying === false) {
 * text('Click to play', 50, 50);
 * } else {
 * text('Playing...', 50, 50);
 * }
 * }
 * 
 * // Play the beat when the user presses the mouse.
 * function mousePressed() {
 * if (isPlaying === false) {
 * isPlaying = true;
 * beat.play();
 * }
 * }
 * 
 * // Set isDone when playback ends.
 * function handleEnd() {
 * isDone = false;
 * }
 * </code>
 * </div>
 */
function onended(callback: Function): void;

/**
 * Sends the element's audio to an output.The parameter, `audioNode`, can be an `AudioNode` or an object from the
 * `p5.sound` library.If no element is provided, as in `myElement.connect()`, the element
 * connects to the main output. All connections are removed by the
 * `.disconnect()` method.Note: This method is meant to be used with the p5.sound.js addon library.
 *
 * @param AudioNode from the Web Audio API,
 * or an object from the p5.sound library
 */
function connect(obj: any, audioNode: AudioNode | object): void;

/**
 * Disconnect all Web Audio routing, including to the main output.This is useful if you want to re-route the output through audio effects,
 * for example.
 *
 */
function disconnect(): void;

/**
 * Show the default
 * HTMLMediaElement
 * controls.Note: The controls vary between web browsers.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background('cornflowerblue');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(50);
 * 
 * // Display a dragon.
 * text('🐉', 50, 50);
 * 
 * // Create a p5.MediaElement using createAudio().
 * let dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('A dragon emoji, 🐉, drawn in the center of a blue square. A song plays in the background. Audio controls are displayed beneath the canvas.');
 * }
 * </code>
 * </div>
 */
function showControls(): void;

/**
 * Hide the default
 * HTMLMediaElement
 * controls.
 *
 * @example <div>
 * <code>
 * let dragon;
 * let isHidden = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * dragon = createAudio('assets/lucky_dragons.mp3');
 * 
 * // Show the default media controls.
 * dragon.showControls();
 * 
 * describe('The text "Double-click to hide controls" written in the middle of a gray square. A song plays in the background. Audio controls are displayed beneath the canvas. The controls appear/disappear when the user double-clicks the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * 
 * // Display a different message when controls are hidden or shown.
 * if (isHidden === true) {
 * text('Double-click to show controls', 10, 20, 80, 80);
 * } else {
 * text('Double-click to hide controls', 10, 20, 80, 80);
 * }
 * }
 * 
 * // Show/hide controls based on a double-click.
 * function doubleClicked() {
 * if (isHidden === true) {
 * dragon.showControls();
 * isHidden = false;
 * } else {
 * dragon.hideControls();
 * isHidden = true;
 * }
 * }
 * </code>
 * </div>
 */
function hideControls(): void;

/**
 * Schedules a function to call when the audio/video reaches a specific time
 * during its playback.The first parameter, `time`, is the time, in seconds, when the function
 * should run. This value is passed to `callback` as its first argument.The second parameter, `callback`, is the function to call at the specified
 * cue time.The third parameter, `value`, is optional and can be any type of value.
 * `value` is passed to `callback`.Calling `media.addCue()` returns an ID as a string. This is useful for
 * removing the cue later.
 *
 * @param cue time to run the callback function.
 * @param function to call at the cue time.
 * @param object to pass as the argument to
 * `callback`.
 * @return id ID of this cue,
 * useful for `media.removeCue(id)`.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * let beat = createAudio('assets/beat.mp3');
 * 
 * // Play the beat in a loop.
 * beat.loop();
 * 
 * // Schedule a few events.
 * beat.addCue(0, changeBackground, 'red');
 * beat.addCue(2, changeBackground, 'deeppink');
 * beat.addCue(4, changeBackground, 'orchid');
 * beat.addCue(6, changeBackground, 'lavender');
 * 
 * describe('A red square with a beat playing in the background. Its color changes every 2 seconds while the audio plays.');
 * }
 * 
 * // Change the background color.
 * function changeBackground(c) {
 * background(c);
 * }
 * </code>
 * </div>
 */
function addCue(time: number, callback: Function, val: any, value?: object): number;

/**
 * Removes a callback based on its ID.
 *
 * @param ID of the cue, created by `media.addCue()`.
 * @example <div>
 * <code>
 * let lavenderID;
 * let isRemoved = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.MediaElement using createAudio().
 * let beat = createAudio('assets/beat.mp3');
 * 
 * // Play the beat in a loop.
 * beat.loop();
 * 
 * // Schedule a few events.
 * beat.addCue(0, changeBackground, 'red');
 * beat.addCue(2, changeBackground, 'deeppink');
 * beat.addCue(4, changeBackground, 'orchid');
 * 
 * // Record the ID of the "lavender" callback.
 * lavenderID = beat.addCue(6, changeBackground, 'lavender');
 * 
 * describe('The text "Double-click to remove lavender." written on a red square. The color changes every 2 seconds while the audio plays. The lavender option is removed when the user double-clicks the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Display different instructions based on the available callbacks.
 * if (isRemoved === false) {
 * text('Double-click to remove lavender.', 10, 10, 80, 80);
 * } else {
 * text('No more lavender.', 10, 10, 80, 80);
 * }
 * }
 * 
 * // Change the background color.
 * function changeBackground(c) {
 * background(c);
 * }
 * 
 * // Remove the lavender color-change cue when the user double-clicks.
 * function doubleClicked() {
 * if (isRemoved === false) {
 * beat.removeCue(lavenderID);
 * isRemoved = true;
 * }
 * }
 * </code>
 * </div>
 */
function removeCue(id: number): void;

/**
 * Removes all functions scheduled with `media.addCue()`.
 *
 * @example <div>
 * <code>
 * let isChanging = true;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.MediaElement using createAudio().
 * let beat = createAudio('assets/beat.mp3');
 * 
 * // Play the beat in a loop.
 * beat.loop();
 * 
 * // Schedule a few events.
 * beat.addCue(0, changeBackground, 'red');
 * beat.addCue(2, changeBackground, 'deeppink');
 * beat.addCue(4, changeBackground, 'orchid');
 * beat.addCue(6, changeBackground, 'lavender');
 * 
 * describe('The text "Double-click to stop changing." written on a square. The color changes every 2 seconds while the audio plays. The color stops changing when the user double-clicks the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Display different instructions based on the available callbacks.
 * if (isChanging === true) {
 * text('Double-click to stop changing.', 10, 10, 80, 80);
 * } else {
 * text('No more changes.', 10, 10, 80, 80);
 * }
 * }
 * 
 * // Change the background color.
 * function changeBackground(c) {
 * background(c);
 * }
 * 
 * // Remove cued functions and stop changing colors when the user
 * // double-clicks.
 * function doubleClicked() {
 * if (isChanging === true) {
 * beat.clearCues();
 * isChanging = false;
 * }
 * }
 * </code>
 * </div>
 */
function clearCues(): void;

/**
 * VIDEO STUFF *
 *
 */
function createMedia(pInst: any, type: any, src: any, callback: any): void;

}

export default function p5_MediaElement(p5: any, fn: any): void;
