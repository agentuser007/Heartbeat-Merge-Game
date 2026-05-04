## Requirements

To be published on CrazyGames, your game must meet our requirements. We designed these standards to ensure all games on our platform are fun, unique, visually appealing, and properly integrated.

Our launch process consists of 2 steps. Read more about the principles on the [introduction page](https://docs.crazygames.com/).

- A game in **Basic Launch** allows you to go live without needing to customize your game for CrazyGames. The **CrazyGames SDK** is optional and monetization is not available. Review the [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/) to understand how progression is evaluated.
- Once your game has been selected for **Full Launch**, you are required to comply to all integration requirements listed below, including the CrazyGames SDK.

The table below provides a summary of the key requirements. Each category has a dedicated page with detailed descriptions:

| **Category**  | **Basic Implementation**<br>Basic Implementation | **Full Implementation\***<br>Full Implementation |
| ------------- | ------------------------------------------------ | ------------------------------------------------ |
| **Technical** | - Initial download size ≤ 50MB                   |

- Total file size ≤ 250MB (_50MB without SDK_)
- File count ≤ 1500 | - SDK & GameplayStart event |
  | **Gameplay** | - Basic visual QA checks
- Adhere to PEGI12 | - Full visual QA check
- Land directly in gameplay |
  | **Advertisement** | - CrazyGames monetization is disabled
- No external ads | - Ads through SDK, following our guidelines
- Works with AdBlock |
  | **Account integration**<br>_Only when applicable_ | - No external login options | - Progress is linked to CrazyGames Account
- Use CrazyGames username & avatar
- Automatic login for CrazyGames users |
  | **Multiplayer**<br>_Only when applicable_ | _Full implementation features might increase engagement and are optional in basic launch_ | - User room info
- Invite link (if applicable)
- Instant multiplayer flow
- Keep rooms across rounds
- DisableChat preference |
  | **In-game Purchases**<br>_Invite Only_ | _Not available_ | - Use CrazyGames Xsolla account and `userId` |

_\* A full implementation should implement the basic implementation requirements as well._

Our **HTML5** and **Unity** SDKs support all the scenarios. Other SDKs might miss certain functionalities.

As part of the submission process, you will also need to provide qualitative metadata (game description and controls) and [Game covers](https://docs.crazygames.com/requirements/game-covers) (images and videos).

## Guidelines & resources

Additionally we offer some [Quality Guidelines](https://docs.crazygames.com/requirements/quality) to optimize your game for success on the CrazyGames platform. These are optional but based on our insights in our audience and web gaming. Guidelines are marked with Guideline throughout the documentation.

Lastly have a look at the Resources provided on this site for additional tips to publish a succesful web game.

## Monetization

The primary monetization mechanism we offer is through advertisement revenue share. Only ads served through our SDK are allowed, refer to our [Advertisement requirements](https://docs.crazygames.com/requirements/ads).

Selected games are eligible for [In-game Purchases](https://docs.crazygames.com/resources/partners#xsolla-payments). A [Full Implementation](https://docs.crazygames.com/requirements/intro) is required, using Xsolla as payments provider. [Contact our team](https://docs.crazygames.com/faq/#contact) if you want to apply for this.

## Insights & Analytics

Once your game has been published, you'll be able to monitor key game metrics on your [Developer Dashboard](https://developer.crazygames.com/). These are some of the metrics we provide by default:

- Players
- Average playtime
- Gameplay conversion
- Retention
- Revenue

To further optimize your game and access advanced analytics — including level progression, drop-off points, and user journey tracking — we recommend utilizing [ByteBrew](https://docs.crazygames.com/resources/partners#bytebrew-analytics). This powerful, free analytics tool is simple to integrate, enabling you to enhance player engagement and boost the visibility of your game on the Crazy Games Portal.

Warning

In case your game collects additional personal data beyond the events in our SDK, the game should add a _Terms & Conditions_ and/or _Privacy Policy_ notice to new players. Check the [User Consent](https://docs.crazygames.com/requirements/technical/#user-consent) section for details.

## Technical support for SDK integration

Once your games reach **50k plays** (combined), we can offer you technical support with SDK integration. This threshold allows us to give each developer individual feedback on ad placements and integration.

## Quality Assurance Tool

On our [Developer Portal](https://developer.crazygames.com/) you'll be able to preview your game. It allows you to:

- Run your game as it would on CrazyGames
- Check if your game meets our requirements
- Test all the SDK features that you implemented and get feedback about it

## Technical requirements

You must follow these technical requirements to get your game published on CrazyGames. We selected these to ensure a fluid user experience when using the platform based on our experience with succesful web games.

## File Size & Count Limits

A key factor of a web game's success is the time it takes for a user to start playing. This is why we enforce strict file size limits.

- [Basic Implementation](https://docs.crazygames.com/requirements/intro) A maximum **total file size of 250MB** is allowed. There's a file count limit on **1500 files** as high file counts will make loading slower.
- [Basic Implementation](https://docs.crazygames.com/requirements/intro) The game must have an **initial download size ≤ 50MB**. In order to be eligible for the mobile homepage, the initial download size needs to be ≤ 20MB.
  - When the SDK is integrated (_optional for basic implementation, mandatory for full implementation_), the initial download size is measured between the start of loading and the occurence of the first `Gameplay start` event triggered through the [`Game module`](https://docs.crazygames.com/sdk/game#gameplay-startstop). This event should be triggered when the user enters in a playable state, so excludes menus and additional loading steps.
  - In case the SDK is not integrated, **total file size is used and thus should be ≤ 50MB (20MB to be eligible for the mobile home page)**.
  - For externally hosted/loaded files our QA team will evaluate based on the **time it takes to reach gameplay (≤ 20 seconds)**.
- Use only **relative paths** when referring to other files in the game bundle. **Never use absolute paths**, as they will fail to load (see [here](https://www.w3schools.com/html/html_filepaths.asp) for additional information).

Refer to our Resources section and specifically to our [Unity custom build](https://docs.crazygames.com/resources/unity-custom-build) feature for optimization guidelines.

## Device & browser compatibility

[Basic Implementation](https://docs.crazygames.com/requirements/intro)

- We expect games to work on Chrome and Edge. Games that don't work well on Safari will be disabled on that browser.
- A significant segment of the CrazyGames audience uses Chromebook. Games will be disabled on Chromium OS if they do not work smoothly on a 4GB RAM device.
- Game supports mouse, keyboard, and touch if mobile is supported.
- Game should be playable in landscape mode on desktop. We allow vertical/portrait games to be published, especially if they are mobile friendly, either with displaying black bars or background images around on the sides.
- CrazyGames has advanced device detection capabilities to distinguish desktop/mobile/tablet, OS browser and application type. We strongly recommend to rely on our [system info](https://docs.crazygames.com/sdk/user/#system-info) to implement a device-specific experience.

### Mobile game requirements

- In order to be eligible for the mobile homepage, the initial download size **can not exceed 20MB**.
- You can configure supported orientation in your submission. The website will make sure your game can be played only in those orientations, by asking the users to rotate their devices. Thus, you don't need to implement any orientation lock logic.
- When playing on some devices like tablets for example, double tapping, or pressing and holding can show the magnification tool, or it can select the entire game and show a contextual menu. To prevent frustration, this CSS should be added to the `body` of your game:

  ```sql
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  ```

- Unity games will be disabled on iOS by default due to frequent crashes (caused by memory shortage). Once your game reaches sufficient plays our team will evaluate the game on iOS and consider enabling it.
- We manage Unity graphics quality (Device Pixel Ratio) to ensure good game performance for users:
  - For iOS devices and low memory Android devices, we choose DPR value of 1 because these devices crash with higher natively supported DPR
  - For other devices the native DPR supported by the device is used (`window.devicePixelRatio`)
  - We can overwrite this configuration manually if we think an exception is needed

#### Resuming audio after iOS interrupts it

##### Problem

Android keeps the [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) in a [running](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#running) state when a user moves to a different app (while still silencing the audio).

On iOS, the AudioContext enters an [interrupted](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#interrupted) state when the app is backgrounded or interrupted by system events like phone calls. iOS therefore requires a proactive approach to restore sound once the user returns.

Some game engines / audio libraries handle this automatically for the developer like Unity. We did notice issues in games using [Howler](https://howlerjs.com/) and [PlayCanvas](https://playcanvas.com/).

##### Solution

The context often transitions to [suspended](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#suspended) when the app is foregrounded. To revive the audio, developers must call the [resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume) method within a valid user-initiated gesture, such as a touchend or click event. Simply listening for a visibility change is insufficient, as WebKit restricts audio playback until a direct interaction occurs.

```javascript
document.addEventListener("touchend", () => {
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
});
```

The AudioContext is created by the developer’s game (or library). For example when using [Howler](https://howlerjs.com/) it will be at Howler.ctx, in [PlayCanvas](https://playcanvas.com/) it’s at pc.app.soundManager.context.

## SDK Integration

The CrazyGames SDK

For the best user experience and to be able to tap into all value of the CrazyGames platform, integrating the SDK is important. Refer to the appropriate game engine in the side menu.

### Basic SDK Integration

[Basic Implementation](https://docs.crazygames.com/requirements/intro)

_If_ you decide to integrate the SDK for a Basic Launch, we require the following:

- A `Gameplay start` event is triggered from the `Game` module when the player reaches game state. This is used to measure [initial download size](https://docs.crazygames.com/requirements/technical/#file-size-count-limits).
- Take into account that **Ads are not allowed** in Basic Launch, and will be disabled even if you would integrate them.

### Full SDK Integration

[Full Implementation](https://docs.crazygames.com/requirements/intro)

A full integration of the SDK, involves the basic integration requirements and these additional ones:

- `Gameplay start/stop` events: allow us to measure and report on gameplay experience
- _(if applicable)_ `Data` module for saving user game progression - see [Progress Save](https://docs.crazygames.com/requirements/account-integration#progress-save)
- _(if applicable)_ `User` module for account integration and using username/avatar - see [Account Integration](https://docs.crazygames.com/requirements/account-integration#use-crazygames-profile)
- _(optional)_ `Load start/stop` events: allow us to measure and report on in-game loading times and fail rates

## Sitelock & Whitelisting

[Basic Implementation](https://docs.crazygames.com/requirements/intro)

To avoid that your game files are stolen, you might implement a sitelock in your game. Read more about in the SDK docs of your game engine. If you implement a sitelock, you need to take into account that CrazyGames operates on multiple domains. If applicable, make sure to whitelist each of our domains to allow all our users to play.

Read more on our page about [Sitelock](https://docs.crazygames.com/resources/html5-resources#sitelock).

## User Consent

In case your game collects additional personal data beyond the events in our SDK, the game should add a _Terms & Conditions_ and/or _Privacy Policy_ notice to new players.

- We recommend to make this a simple notice rather than a pop-up blocking the user.
- [Bloxd.io](https://www.crazygames.com/game/bloxdhop-io) shows a good example of in-game privacy policy
- [Racing Limits](https://www.crazygames.com/game/racing-limits) opens the privacy policy in a new tab

## Gameplay requirements

This page outlines the requirements that submitted games must meet to ensure a high-quality game experience. While we are not looking for the "perfect" game, our goal is to help players discover your well-crafted game without encountering inappropriate or subpar content. Only games that prioritize quality and gameplay will be allowed on the platform. Developers who repeatedly submit non-compliant games may face restrictions on future submissions.

Our quality guidelines are inspired by the [Facebook games](https://www.facebook.com/fbgaminghome/developers/instant-games/best-practices-game-submissions).

## Basic Gameplay Requirements

[Basic Implementation](https://docs.crazygames.com/requirements/intro)

Our team performs several visual and functional checks on each submitted game. Ensure your game meets the following criteria:

- **Readable Content:** Text and images must be legible on devices with a `devicePixelRatio:1`, on responsive iframe sizes (16x9 ratio) and mobile screens (if applicable). These are the most important iframe sizes for our audience:
  - `907 x 510 px` (desktop - non-fullscreen)
  - `1216 x 684 px` (desktop - non-fullscreen)
  - `1077 x 606 px` (desktop - non-fullscreen)
  - `821 x 462 px` (desktop - non-fullscreen)
  - `1366 x 768 px` (desktop - fullscreen)
  - `1920 x 1080 px` (desktop - fullscreen)
  - `1536 x 864 px` (desktop - fullscreen)
  - `1280 x 720 px` (desktop - fullscreen)
  - `800 x 450 px` (mobile)
  - `1080 x 607 px` (tablet)
- **Consistent Physics:** The game's physics must perform consistently across different monitor refresh rates (e.g. 144 Hz, 165 Hz)
- **Language Support:**
  - The game must have English localization
  - If translations are included, they should be accurate and of high quality. The game should use the user's language based on `locale` info provided through the [system info method](https://docs.crazygames.com/sdk/user/#system-info) in our SDK, and if not available/set fallback to English.
- **Intuitive controls:** The game should have intuitive controls on different types of devices. Have a look at the section about [restricted keys](https://docs.crazygames.com/requirements/quality#restricted-keys)
- **Smooth Performance:** The game must load quickly and play seamlessly without errors or crashes
- **Originality:** Game names, assets, and overall content should exhibit originality
- **Fullscreen Functionality:** Fullscreen mode is automatically provided by CrazyGames. Custom in-game fullscreen buttons are prohibited, as they can interfere with other features (e.g. monetization).
- **No Cross-Promotion:** The game should not include cross-promotions for external or internal games/platforms.
  - Exception: Privacy Policy and Terms and Conditions if applicable. Check [requirements intro](https://docs.crazygames.com/requirements/intro/#privacy-consent) for details.
  - Following exceptions are allowed as long as these are not a main CTA on the menu :
    - Community links (discord, dev website, ...) are allowed on the game menu only as long they don’t lead directly to a playable web version
    - Game Store (Epic, Steam, ...) links to the game on desktop games only on main menu or at the end of a demo game
    - Backlinks to CG home or category page are accepted but not promoted
    - Links to other game(s) in the same series of games (e.g. Horror Tale 1, 2, 3, …)
  - App Store links are never allowed in-game, and should use the configurable game metadata fields in our Developer Portal
- **Suited for minors:** CrazyGames is a website for an audience aged 13 or more. Your game must be [PEGI 12](https://pegi.info/what-do-the-labels-mean) compliant.
  - We host a standalone website dedicated for [kids games](https://kids.crazygames.com/), yet note that monetization is disabled on that domain.

## Full Gameplay Requirements

[Full Implementation](https://docs.crazygames.com/requirements/intro)

These additional requirements are mandatory for full implementations:

- Games should land new users in gameplay immediately.
- If this is not feasible given the game specifics, a maximum of 1 click is allowed.

## Additional Quality Guidelines

Guideline

Have a look at our [Quality Guidelines](https://docs.crazygames.com/requirements/quality) for more suggestions and best practices on how to publish a succesful game, covering onboarding and other principles. These are not mandatory but strongly recommended.

## Advertisement requirements

[Full Implementation](https://docs.crazygames.com/requirements/intro)

Warning

- If your game is currently in the [Basic Launch](https://docs.crazygames.com/#launching-on-crazygames) phase:
  - Advertisements will be disabled; no revenue will be shared.
  - If you did integrate the Ads SDK, our team will check to make sure the game runs smoothly while ads are disabled. The game will be rejected if it does not. _For example: Game doesn't freeze between levels. There should not be rewarded ad buttons without effect._
- Only Ads requested through the CrazyGames SDK are allowed.

These types of advertisements are available through the CrazyGames SDK:

- Video ads
  - Midgame ads: between levels or stages
  - Rewarded ads: when giving a reward (CrazyGames provides fallback banners)
- In-game banners

In-game ads and purchases should provide a meaningful and rich experience for the player and should not appear before the user has experienced a reasonable amount of gameplay. Most importantly, in-game ads should not:

- Interrupt gameplay
- Trigger deceptively
- Chain multiple ads

## Video ads

![Video](https://docs.crazygames.com/img/requirements/ads/video.png)

- **Video ads can not interrupt gameplay and shouldn't come as a surprise:** Advertisements should not be shown while a user is playing. We do not allow disruptive ads since they will scare users away. Instead, show them at a logical point for the user. Examples are during a level transition, a map change when the player died etc. Do not show a midgame ad on a navigational button (e.g. when clicking the main menu icon or opening the settings or opening the shop).
- **Your game should be paused during a video ad:** Ensure that a user cannot progress the game while requesting or showing an ad. Disable buttons, or show a spinner that blocks interaction. An ad request is not instantaneous: several auctions are held and take some time to return with a reply. Block the UI until either an `adFinished` or `adError` event occurs.
- **Handle unfilled ad calls correctly:** Sometimes, the request for a midgame ad will be unfilled (either because of timing restrictions, adblock, or low demand). In this case you receive an `adError` event. You should handle this case correctly and ensure that the game continues.
- **Your game should be muted during a video ad:** Video advertisements have audio. Ensure that your in-game sound and the advertisement audio are not playing together. You should mute your audio whenever an advertisement starts playing, and unmute it when the ad has finished. Only mute the audio when the ad actually starts playing, and not when you request an ad. It is possible no advertisement is available, and muting and unmuting your music without a visual change is not user-friendly.
- **Request midgame ads at opportune moments without worrying about frequency or minimum intervals:**
  - We take care automatically of how often a midgame ad is shown, taking into account the start of the game, the midroll frequency (max 1 every 3 minutes) and interplay with rewarded ads
  - If the next midgame ad request is too early, it just gets ignored by the SDK and there is no impact for the user. This means that you can request a midgame ad at any opportune moment in the game without worrying about when the last midgame was shown

### Rewarded ads

Rewarded ads should be special opportunities that a user looks forward to, and not an expectation whenever the user plays your game. Poorly designed levels that can only be completed by a rewarded ad are not acceptable. Instead, occasionally give the user the option to watch a rewarded ad that gives them a cool bonus, or a funny cosmetic change.

We have strict requirements to include rewarded advertisements. Before you start implementing please make sure you read them carefully:

**Placement and frequency**

- Do not offer a rewarded ad too often. Inform the user of this with a timer or hide the ad request button.
- Do not chain multiple ads, i.e. watch more than one rewarded ad to receive a single reward.
- Do not promote the rewarded ads too aggressively. If the game rewarded ads are well-implemented users will want to use them, there is no need to remind them too often.
- The request button should not appear on an active gameplay screen. For example, in a racing game, the request button can't appear during the race.

**Reward UI**

- The button to request a rewarded ad should be easily accessible in a consistent location.
- The button to request a rewarded ad can not be misleading in any way. Specifically, the continue without watching a rewarded ad should be the same size, font, color, etc.
- It needs to be clear immediately that the reward is optional. Hiding or delaying the skip or close button on the offer is not allowed.
- It needs to be clear for players that they will have to watch an advertisement in exchange for the reward. This can be done by displaying a video icon for example.
- Provide an alternative to watching an ad. For example, a user can also buy the reward with coins that he can receive during the game.

**Rewarded ads callbacks**

- When the ad has finished (`adFinished`), make it clear that the player iss rewarded. You can display an animation or a notification.
- When our rewarded ad returns with an `adError` callback, do NOT reward the player.
  - We aim for a high ad fill rate, and provide alternative incentives if no ads are available.
  - See below for more info about [Ad Blockers](https://docs.crazygames.com/requirements/ads/#adblockers).

**Rewarded ad examples:**

In-game store ads are a great way to monetize players who are in a "purchase" mindset. You can award monetary value or items they otherwise have to buy.

![Banner](https://docs.crazygames.com/img/requirements/ads/banner.png)

- In-game banners are only allowed on useful screens with content that are open for at least 5 seconds on average.
- Make sure that in-game banners do not block any game UI on all game sizes (including on mobile).
- Do not show in-game banners during game-play.
- In-game banners must be clearly distinguishable from game content.

## Adblockers

[Full Implementation](https://docs.crazygames.com/requirements/intro)

We strive to limit the use of adblockers on the CrazyGames platform, by disabling certain functionalities and blocking rewarded ads when an adblocker is detected. However since this detection won't ever be 100% correct, we want to ensure that even users where we detect an AdBlocker can play the game according to these rules:

- Players with AdBlocker should be able to play the game normally: It is never allowed to block players with AdBlockers from playing, or penalize players with certain disadvantages
- You can block certain features or special functionalities in the game; make sure to show a notice on such functions that they are blocked because of the AdBlocker usage
  - Do not use popups as they might interfere with fullscreen behaviour and with CrazyGames adblock notices
  - Do not keep the rewarded ads clickable but without effect

## Account integration requirements

The CrazyGames account system

The CrazyGames account system is a powerful tool that allows our users to save progress, play on multiple devices, customize their username and avatar and play with their friends. The most succesful games on our site integrate seamlessly with our account system.

Over **35 million** players have a CrazyGames account, many of them playing actively every week.

We want to ensure this experience for our users:

- No standalone in-game username or avatar is needed
- No additional login flows in-game are needed
- Guests can also play the games

## Integration scenarios

We understand these requirements can have a substantial impact on your game. However it's not necessary to do customization before releasing your initial game version which we describe below. We distinguish these 4 scenarios:

[Basic Implementation](https://docs.crazygames.com/requirements/intro)

If your game doesn’t have the notion of users, you are not expected to integrate with our user module.

You can however use the [Data module](https://docs.crazygames.com/sdk/data) in our SDK to save user progress, or alternatively rely on our [APS system](https://docs.crazygames.com/other/aps).

## Progress save

[Full Implementation](https://docs.crazygames.com/requirements/intro)

Saving game progress

Players care A LOT about their progress in games, and expect their progress to synchronize across their devices. CrazyGames offers a number of methods to save progress in the cloud. Unless progress is not applicable for your game, we require you to implement one of these methods.

1.  Preferably you use the [CrazyGames Data module](https://docs.crazygames.com/sdk/data) which saves the user's progress on their CrazyGames account.
    - Progress for guest users is automatically saved locally
    - When a guest logs in the progress is synced to their cloud (as long as no cloud progress was present).
2.  If your game has their own back-end to save data, you can use the [User module](https://docs.crazygames.com/sdk/user) to link back-end data to the user's CrazyGames account.
    - Take into account the flows described above in [In-game account integration](https://docs.crazygames.com/requirements/account-integration/#in-game-account-integration) to handle specific scenarios like guests logging in.
    - Make sure to consider that the same user might log in on multiple devices, and multiple accounts can share a single device.
3.  _Alternatively you can use our [Automatic Progress Save](https://docs.crazygames.com/other/aps) system, which automatically syncs local progress to the cloud. This is not allowed for games with in-game purchases as it relies on local data._

## In-game account integration

[Full Implementation](https://docs.crazygames.com/requirements/intro)

This section explains how to integrate CrazyGames accounts with your in-game account system according to our requirements.

### Preparation

Your CrazyGames game version will need to allow using CrazyGames `userId` as identifiers within the game. This is a unique string tied to the CrazyGames account that can be accessed through the [User module](https://docs.crazygames.com/sdk/user) in our SDK.

### Logic to implement at game launch

Start by retrieving the current user by calling [`getUserToken()`](https://docs.crazygames.com/sdk/user/#get-user-token) to get a JWT Token and verifying the token on your server. This will get you the player's `userId`.

Request the current user account **every time** the game starts, making sure to cover cases where different users share the same device or users change profile information (avatar/username/...).

#### Option 1: User is not logged in (`userNotAuthenticated` error)

You should always allow the user to start playing as Guest, as main scenario.

Creating in-game accounts for CrazyGames guests

We recommend **NOT** to create an in-game account in this scenario. If you do, you **should be able to link it to a CrazyGames account when the guest logs in**. Avoid relying solely on local data to identify Guests across sessions as multiple users might share the same device.

It is allowed to show a [Login with CrazyGames](https://docs.crazygames.com/requirements/account-integration/#login-button) button but not as a main CTA.

Don't trigger the [Auth prompt](https://docs.crazygames.com/sdk/user/#auth-prompt) automatically as this might confuse the user

#### Option 2: User is logged in on CrazyGames (`userId` is returned)

Check if the CrazyGames `userId` account already exists in your back-end.

- **Case:** CrazyGames account (`userId`) is already known in your back-end:
  - Users can update their CrazyGames username & avatar, so if you store this info on your back-end make sure to update it by calling an endpoint on your server with the actual username and profile picture.
  - Fetch the data for this user from your back-end, and start playing!
- **Case:** The CrazyGames account (`userId`) is not yet known to your game:
  - Automatically create a game account using the player's CrazyGames account. Make sure to make the link based on the `userId` unique field, as other fields like `username` might change.
  - _(optional) If feasible and desired, you can save any local progress the user made as guest to the new account. Alternatively this user will have fresh data in your back-end._

### Logic to implement during the game

#### Players changing CrazyGames accounts while playing

- Guest users logging into their CrazyGames account while playing should be detected using an [Auth Listener](https://docs.crazygames.com/sdk/user/#auth-listener), in this case we will expect you to follow the "User is logged in on CrazyGames" flow above and if necessary refresh the game. This only applies to users playing as guest in the game.
  - When a user logs out during gameplay, the entire web page is refreshed, so there is nothing else to do in this case. The game flow will start from the beginning.

#### Login Button

You can show a login button to guests:

- Do not make this the main CTA blocking the user
- A good placement is in the top right corner
- If you do this, the button should trigger the [Auth prompt](https://docs.crazygames.com/sdk/user/#auth-prompt) method in our SDK.
- **Don't allow Guests to use different login methods than 'Login with CrazyGames'**

#### Logout & account linking

- Logging out in the game and allowing login with external login options (e.g. Facebook, Google, email) is not allowed.
- If you want to offer importing existing in-game accounts or exporting CrazyGames account, you are responsible for transferring/migrating progress correctly.
  - Our SDK contains an optional [Account link prompt](https://docs.crazygames.com/sdk/user/#account-link-prompt) function
  - This is strongly recommended if you create in-game accounts for CrazyGames guests
  - If your game has In-Game Purchases, this is recommended if you create in-game accounts for CrazyGames guests

Sitelock helps prevent your HTML5 game from being copied and hosted on unauthorized websites.

## Protecting HTML5 games

To prevent your game from being stolen by other websites, check whether the game is running on `crazygames.*` domains. This is an example domain that should support loading the game: `https://cubes-2048-io.game-files.crazygames.com/cubes-2048-io/13/index.html`

Your can use this function to ensure your game runs on valid CrazyGames domains.

```javascript
function isCrazyGames() {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const idx = parts.indexOf("crazygames");
  return idx !== -1 && idx >= parts.length - 3;
}
```

If this check fails, you can show a message such as "Available only on CrazyGames" or render a blank screen.

To improve sitelock robustness, you can obfuscate relevant parts of your game code with a tool like [obfuscator.io](https://obfuscator.io/).

## Protecting iframe games

To prevent iframe embedding, configure the CSP header: `Content-Security-Policy: frame-ancestors [...]`

If you submit your game as an iframe game, keep in mind that CrazyGames has multiple regional domains (for example `www.crazygames.no`, `www.1001juegos.com`, `www.crazygames.fr`). You must whitelist all supported CrazyGames domains:

```less
// General
*.crazygames.com
crazygames.*   // * can be a TLD consisting of 1 or 2 parts like .fr or .com.br

// Exhaustive list
www.crazygames.com
de.crazygames.com
it.crazygames.com
vn.crazygames.com
gr.crazygames.com
ar.crazygames.com
th.crazygames.com

www.crazygames.fr
www.crazygames.co.id
www.crazygames.cz
www.crazygames.dk
www.crazygames.hu
www.crazygames.nl
www.crazygames.no
www.crazygames.pl
www.crazygames.com.br
www.crazygames.ro
www.crazygames.fi
www.crazygames.se
www.crazygames.ru
www.crazygames.com.ua
www.crazygames.at
www.crazygames.jp
www.crazygames.pt
www.crazygames.vn
www.crazygames.com.vn
www.crazygames.co.kr

// video ads run on
games.crazygames.com

//deprecated domains (no longer need whitelisting)
www.1001juegos.com
tr.crazygames.com
```

The `ad` module contains functionality for displaying video ads and for detecting adblockers.

Requirements for Advertisements

Please be sure to read our [advertisement requirements](https://docs.crazygames.com/requirements/ads), since your game will be rejected without any feedback if it doesn't follow them.

When integrating the CrazyGames SDK, make sure to follow our [requirements](https://docs.crazygames.com/requirements/intro). They will help you use the SDK in the best way possible and guide you in terms of technical, gameplay, ads and account integration requirements.

Our HTML5, Unity, and Godot SDKs support all the scenarios. Other SDKs miss certain functionalities for which you can usually manage at least basic integration through the HTML5 version. Most game engines that support WebGL also have a way of interacting with JavaScript when running in browser.

The SDK has the following modules:

| `ad`              | display video ads & detect adblockers            | 🟩 Fully supported |
| ----------------- | ------------------------------------------------ | ------------------ |
| `banner`          | display banners                                  | 🟩 Fully supported |
| `game`            | various game events and integration              | 🟩 Fully supported |
| `user`            | interact with logged in user                     | 🟩 Fully supported |
| `data`            | store user data that persists across devices     | 🟩 Fully supported |
| In-game Purchases | handle in-game purchases (not a separate module) | 🟩 Fully supported |

## Getting started

This section explains how to get the CrazyGames SDK up and running in your engine.

You can install the SDK by including the following script in the head of your game's `index.html`:

```php-template
<!-- Load the SDK before your game code -->
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

Manual initialization

The v3 SDK requires initialization before being used. This can be done by calling the init method:

```csharp
await window.CrazyGames.SDK.init();
```

It is important to `await` for the initialization since it happens asynchronously, and the SDK is unusable until initialized. We recommend that you do this before the game starts, for example on the loading screen.

**Promises**

The SDK relies on promises and doesn't accept a `callback` parameter. If you don't have the possibility to use `await`, you can call the async methods with `.then(...).catch(...)`, like in the example below:

```javascript
// await example
try {
  const user = await window.CrazyGames.SDK.user.getUser();
  console.log(user);
} catch (e) {
  console.log("Get user error: ", e);
}

// .then .catch example
window.CrazyGames.SDK.user
  .getUser()
  .then((user) => console.log(user))
  .catch((e) => console.log("Get user error: ", e));
```

The HTML5 SDK docs will contain only examples using `await`.

## Important information

Don't miss this section with important information regarding your engine

**Major changes when migrating from v2 to v3**

You can find the docs for the old HTML5 v2 SDK [here](https://docs.crazygames.com/sdk/html5-v2/intro).

- The SDK requires to be manually initialized now
- Some async get methods are now simple variables:
  - `window.CrazyGames.SDK.environment`
  - `window.CrazyGames.SDK.user.isUserAccountAvailable`
  - `window.CrazyGames.SDK.user.systemInfo`
- Methods to report loading changed from `sdkGameLoadingStart()` and `sdkGameLoadingStop()` to `loadingStart()` and `loadingStop()`
- The v2 SDK was throwing inconsistent errors (strings or objects). The v3 SDK has now the following error format:

  ```css
  // there is always a "code" and a "message" containing more information
  {code: 'userAlreadySignedIn', message: 'The user is already signed in'}
  ```

## Development & Testing

During the development, you will be running your game on different domains/environments:

- `localhost` - our SDKs work fine on localhost domains, where they display demo ads/banners and try to simulate other behaviour.
- `editors` - this applies to Unity, Construct, Cocos, etc. In editors our SDKs will also display demo ads/banners and try to simulate other behaviour.
- `Preview tool` - our QA environment (on `crazygames.com/preview`) offers the most realistic version of CrazyGames.com. After you've finished integrating the SDK, create a new game on [Developer Portal](https://developer.crazygames.com/), upload your files, and you will be able to preview your game. Obtaining a working Xsolla token is possible only here.

- The `localhost` and `127.0.0.1` domains are considered `local` environments. Advertisements are not available. Instead, an overlay text will be displayed. For other events such as happy time, gameplay start, etc. the console output can be consulted. If you are using a different domain/ip for local development, you can always enforce the `local` environment by appending the `?useLocalSdk=true` query parameter to the URL in your browser.
- On `CrazyGames` domains the SDK has the `crazygames` environment, where it functions properly.
- On any other domains (including your domain on which you may host your game) the SDK has the `disabled` environment. All the calls to the SDK methods will throw an error. To prevent this, we recommend checking on which environment the SDK is running and avoiding making use of it outside `local` or `crazygames` environments.

The environment can be retrieved like this:

```
window.CrazyGames.SDK.environment;
```

## Getting started

After reading our [SDK Introduction](https://docs.crazygames.com/sdk/intro/) page for your engine, access the `ad` module like this:

```
window.CrazyGames.SDK.ad;
```

## Video ads

We support two different types of video ads: `midgame` and `rewarded`. Read more on our [advertisement requirements](https://docs.crazygames.com/requirements/ads).

- Midgame advertisements can happen when a user died, a level has been completed, etc.
- Rewarded advertisements can be requested by the user in exchange for a reward (An additional life, a retry when the user died, a bonus starting item, extra starting health, etc.).

To request a video ad:

```javascript
const callbacks = {
  adFinished: () => console.log("End midgame ad"),
  adError: (error) => console.log("Error midgame ad", error),
  adStarted: () => console.log("Start midgame ad"),
};
window.CrazyGames.SDK.ad.requestAd("midgame", callbacks);
// or
window.CrazyGames.SDK.ad.requestAd("rewarded", callbacks);
```

Warning

Make sure to mute the audio and pause the game when the ad starts (`adStarted` callback), and to unmute the audio and continue the game when the ad finishes/fails to load (`adError` and `adFinished` callbacks)

## Callbacks

The `adError` callback is also triggered if the ad is not filled or if something else goes wrong. Your game should be able to handle this. CrazyGames provides fallback banners and house-ads to limit unfilled ads.

The returned `errorData` object will look like this:

```css
{
    "code": "unfilled",
    "message": "No ad available"
}
```

Possible error codes:

- `adsDisabledBasicLaunch` - during Basic Launch ads are disabled
- `unfilled` - no ad available
- `adblock` - an adblocker prevents showing ads
- `adCooldown` - the ad was requested too soon, the usual midgame ad request interval is 3 minutes, taking rewarded and preroll ads into consideration.
- `other`

## Adblock detection

Info

We require games to function even when the user has an adblock. The detection is not foolproof, and it would be very frustrating for a user not running any adblock to get a non-functional game. You can block extra content, such as custom skins, or some levels, to motivate the user to turn off their adblock. Also, keep in mind that turning off the adblock usually requires a page refresh. Make sure that the progress is saved, or the user may just decide to stop playing your game.

You can use the code below to detect if the user has an adblocker.

```javascript
const result = await window.CrazyGames.SDK.ad.hasAdblock();
console.log("Adblock usage fetched", result);
```

The `game` module contains various functionality related to the game. After reading our [SDK Introduction](https://docs.crazygames.com/sdk/intro/) page for your engine, access the `game` module like this:

```
window.CrazyGames.SDK.game;
```

## Game Settings

The game module contains a `settings` object, that can be accessed like this:

```
window.CrazyGames.SDK.game.settings;
```

The settings object contains:

- `disableChat` - if `true`, the game should disable chat (if applicable). Read more about chat on [multiplayer requirements](https://docs.crazygames.com/requirements/multiplayer) page. Locally you can use `?disableChat=true` to force this to true.
- `muteAudio` - please disable the game audio if this is true. Locally you can use `?muteAudio=true` to force this to true.

You can also register a listener which will be called each time the game settings change:

```javascript
function listener(newSettings) {
  console.log("Settings updated", newSettings);
}

// to add a listener
window.CrazyGames.SDK.game.addSettingsChangeListener(listener);

// to remove a listener
window.CrazyGames.SDK.game.removeSettingsChangeListener(listener);
```

## Gameplay start/stop

We provide functions that enable us to track when and how users are playing your games. These can be used to ensure our site does not perform resource intensive actions while a user is playing.

The `gameplay start` function has to be called whenever the player starts playing or resumes playing after a break (game start, resume, revive, enter next level, ...). The first event is used to determine your game's initial loading size.

The `gameplay stop` function has to be called on every game break (entering a menu, ending level, pausing the game, ...) don't forget to call `gameplay start` when the gameplay resumes. Don't call this event when the user switches focus or leaves the game area (we handle this on our side).

You can call the methods like this:

```javascript
window.CrazyGames.SDK.game.gameplayStart();
window.CrazyGames.SDK.game.gameplayStop();
```

## Game loading start/stop

We provide functions that enable us to track when and how long the loading of your game takes.

The `loading start` function has to be called whenever you start loading your game.

The `loading stop` function has to be called when the loading is complete and eventually the gameplay starts.

```javascript
window.CrazyGames.SDK.game.loadingStart();
window.CrazyGames.SDK.game.loadingStop();
```

## Happy time

The `happytime()` method can be called on various player achievements (beating a boss, reaching a highscore, etc.). It makes the website celebrate (for example by launching some confetti). There is no need to call this when a level is completed, or an item is obtained.

Info

Use this feature sparingly, the celebration should remain a special moment.

```
window.CrazyGames.SDK.game.happytime();
```

## Game context

Users can send feedback related to your game, which is sent to you via an email, and can be also viewed on our [Developer Portal](https://developer.crazygames.com/).

To make this feedback more actionable, you can use the `setGameContext` method to attach relevant in-game data. For example, you might include the user's current level, equipped weapon, gold amount, or active skins.

Providing this context makes it significantly easier to understand and reproduce issues. For instance, if a user reports being stuck but doesn't specify where, the attached data can immediately reveal the exact level and game state.

```javascript
// this can be called at the start of the level
window.CrazyGames.SDK.game.setGameContext({
  level: 12,
});

// don't forget to clear the context when not relevant anymore, for example if the user exists the level
window.CrazyGames.SDK.game.clearGameContext();
```

## Multiplayer features

This section describes the game specific SDK functionality supporting our [Multiplayer Requirements](https://docs.crazygames.com/requirements/multiplayer). Refer to that page for additional context on mandatory/optional requirements.

Demo game

We also created a [demo game](https://www.crazygames.com/game/unity-multiplayer-demo) that showcases various multiplayer features from our SDK. You can download the source code from [here](https://sdk.crazygames.com/MultiplayerDemoGame.zip).

### Instant multiplayer

The game module contains the `isInstantMultiplayer` flag that indicates if you should direct the user into multiplayer mode, in a joinable location directly.

```javascript
// this field was previously called isInstantJoin which is now deprecated,
// please use isInstantMultiplayer
window.CrazyGames.SDK.game.isInstantMultiplayer;
```

### Room data

We define the `room` as a unique location where the user is playing or waiting in your game. Having room information available on platform level allows us to improve the user experience through showing an invite button, platform notifications, status visualization, joining friends, listing other CrazyGames users in your room to make friends connections, and more. The room doesn't have to exist on the server, you could also consider a room a special case when some players are connected to each other directly, via WebRTC for example.

The `room` contains the following data:

- `roomId` - unique identifier for this room. If your game supports multiple regions, please ensure the roomId you report is unique across the regions, for example by joining the actual room id with the region id.
- `isJoinable` - allows the current player to invite other players or be joined by other players
- `inviteParams` - these will be passed to other players who accept an invitation, or join this player. Read more about the `inviteParams` in the [room join listener](https://docs.crazygames.com/sdk/game/#room-join-listener) section.

```php
// the player joins a room
window.CrazyGames.SDK.game.updateRoom({ roomId: "123eu" });

// the room is now open, the current player can invite other players or be joined by other players
// the inviteParams are just an example, you may have other parameters required to join a specific room
window.CrazyGames.SDK.game.updateRoom({ isJoinable: true, inviteParams: { roomName: "123", region: "eu" }});

// the room is full and no more players can joinon
window.CrazyGames.SDK.game.updateRoom({ isJoinable: false});

// the player left the room
window.CrazyGames.SDK.game.leftRoom();

// you can always mix more parameters, for example if the player joins a room and the room is already joinable
window.CrazyGames.SDK.game.updateRoom({ roomId: "123eu", isJoinable: true, inviteParams: { roomName: "123", region: "eu" }});
```

### Room join listener

When the user tries to join their friends via an invite notification, invite link or friends drawer, there are 2 possible scenarios:

- The user is already in game. In this case the room join listener will be triggered.
- The user is redirected to the game page, and the game has to load. Use the `inviteParams` in this case.

```javascript
// don't forget to check window.CrazyGames.SDK.game.inviteParams on game start
// if it is not null, your game was already started from an invite link, and you should send the player to the correct room

function listener(inviteParams) {
  // send the user to the multiplayer room
}

// to add a listener
window.CrazyGames.SDK.game.addJoinRoomListener(listener);

// to remove a listener
window.CrazyGames.SDK.game.removeJoinRoomListener(listener);
```

### Invite link

This feature lets you share the CrazyGames version of your game to the players and invite them to join a multiplayer game. You can call `invite link` with a map of parameters that correspond to your game or game room. If your game only accepts players from the same region, you can add `region` as a parameter to the link. That way you can easily handle the scenario when users attempt to join from a different region.

```php
const link = window.CrazyGames.SDK.game.inviteLink({
    roomName: 12345,
    param2: "value",
    param3: "value",
});
console.log("Invite link", link);
```

The invite link parameters can be retrieved with the help of the `getInviteParam` method, for example:

```javascript
// returns either a string or null if the parameter is missing
window.CrazyGames.SDK.game.getInviteParam("roomName");
```

You can also access all invite parameters like this:

```
window.CrazyGames.SDK.game.inviteParams
```

inviteParams is `null` if the game wasn't started from an invite link.

### Invite button

Deprecated

This feature is replaced by the [Room Data](https://docs.crazygames.com/sdk/game/#data) functionality and will be deprecated.

This feature indicates that the user is in a multiplayer room and can be joined.

```perl
const link = window.CrazyGames.SDK.game.showInviteButton({
    roomName: 12345,
    param2: "value",
    param3: "value",
});
// the returned link looks the same as the link
// returned by the inviteLink method
console.log("Invite button link", link);
```

Make sure to hide the invite button when the user can't be joined anymore (e.g. the room is full, the game has started or the lobby was canceled).

```
window.CrazyGames.SDK.game.hideInviteButton();
```

The user module provides various account functionality that you can use to authenticate a user in your game. This means that the CrazyGames players who are logged in on the platform will be able to play games that require a user account without having to register in the game. They will also be logged in automatically in the game on other devices where they use the same CrazyGames account.

The [account integration](https://docs.crazygames.com/requirements/account-integration) page already familiarized you with the possible user integration scenarios. For the scenarios where authentication is available, please consult the appropriate link below.

## Getting started

After reading our [SDK Introduction](https://docs.crazygames.com/sdk/intro/) page for your engine, the `user` module can be accessed like this:

```
window.CrazyGames.SDK.user;
```

## Check availability

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

The user account functionality is not available on other domains that embed your CrazyGames game. Before using any user account features, you should always ensure that the user account system is available.

```javascript
const available = window.CrazyGames.SDK.user.isUserAccountAvailable;
console.log("User account system available", available);
```

## Get current user

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

You can retrieve the user currently logged in CrazyGames with the following method:

```javascript
const user = await window.CrazyGames.SDK.user.getUser();
console.log("Get user result", user);
```

If the user is not logged in CrazyGames, the returned user will be `null`

User ID

The user ID `__dangerousUserId` should not be used for authentication. Anyone can easily inject malicious code in the browser, including user IDs, and gain access to other user accounts. For authentication, please use the [user token](https://docs.crazygames.com/sdk/user/#get-user-token).

The returned user object will look like this:

```json
{
  "__dangerousUserId": "GAR5irLOPebfbol3QXww2WL1Ja61",
  "username": "SingingCheese.TLNU", // 6-20 chars (alfanumeric, period, underscores)
  "profilePictureUrl": "https://images.crazygames.com/userportal/avatars/4.png"
}
```

CrazyGames usernames are 6-20 characters and can contain letters, numbers, period and underscore.

## System info

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

System info can be retrieved like this:

```javascript
const systemInfo = window.CrazyGames.SDK.user.systemInfo;
```

The response will look like this:

```perl
{
    "countryCode": "US",
    "locale": "en-US",
    "device": {
        // possible values: "desktop", "tablet", "mobile"
        "type": "desktop"
    },
    "os": {
        //Format cfr. [ua-parser-js](https://github.com/faisalman/ua-parser-js){target=\_blank}
        "name": "Windows",
        "version": "10"
    },
    "browser": {
        //Format cfr. [ua-parser-js](https://github.com/faisalman/ua-parser-js){target=\_blank}
        "name": "Chrome",
        "version": "107.0.0.0"
    },
    "applicationType": "web" // possible values: "google_play_store", "apple_store", "pwa", "web"
}
```

Warning

If you want to automatically set the language of the game based on user location, please use the **locale** field for this.

## Get friends

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

You can retrieve current user's friends like this:

```javascript
try {
  const friendsPage = await window.CrazyGames.SDK.user.listFriends({
    page: 1,
    size: 10,
  }); // page starts at 1, max size is 50
  console.log("List friends result", friendsPage);
} catch (e) {
  console.log("Error:", e);
}
```

The response will look like this:

```json
{
  "friends": [
    {
      "id": "Uvqz2K6p7qOG9BMW0gW3Lso6lC02",
      "username": "SunMedusa.cWV0",
      "profilePictureUrl": "https://images.crazygames.com/userportal/avatars/16.png"
    }
  ],
  "page": 1,
  "size": 10,
  "hasMore": false,
  "total": 1
}
```

The following error codes can be returned:

- `userNotAuthenticated` - the user is not logged in CrazyGames
- `rateLimited` - method calls are limited every 250ms
- `requestInProgress` - only one active call is allowed
- `unexpectedError`

## Get user token

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

The user token contains the `userId` of the player that is currently logged in CrazyGames, as well as other useful information (`username`, `profilePictureUrl`, etc). You should send it to your server when required, and verify/decode it there to extract the `userId`. This is useful for linking the user accounts for example, where you can have a column "crazyGamesId" in your user table that will be populated with the user id from the token.

You can retrieve the user token with the following method:

```javascript
try {
  const token = await window.CrazyGames.SDK.user.getUserToken();
  console.log("Get token result", token);
} catch (e) {
  console.log("Error:", e);
}
```

The token has a lifetime of 1 hour. The method will handle the token refresh. We recommend that you don't store the token, and always call this method when the token is required.

The following error codes can be returned:

- `userNotAuthenticated` - the user is not logged in CrazyGames
- `unexpectedError`

The returned token can be decoded for testing purposes on [jwt.io](https://jwt.io/).

The token payload will contain the following data:

```json
{
  "userId": "UOuZBKgjwpY9k4TSBB2NPugbsHD3",
  "gameId": "20267",
  "username": "RustyCake.ZU9H", // 6-20 chars (alfanumeric, period, underscores)
  "profilePictureUrl": "https://images.crazygames.com/userportal/avatars/16.png",
  "iat": 1670328680,
  "exp": 1670332280
}
```

Do not decrypt tokens on the client

Make sure not to decrypt the user token on client-side as this is insecure. The typical info you need on the front-end (username, avatar) can easily be obtained by using the `getUser` method.

When you need to authenticate the requests with your server, you should send the token together with the requests.

The token can be verified with the public key hosted at [this URL](https://sdk.crazygames.com/publicKey.json). We recommend that you fetch the key every time you verify the token, since it may change. Alternatively, you can implement a caching mechanism, and re-fetch it when the token fails to decode due to a possible key change.

Below is a TypeScript example that will help you decode and verify the token:

```typescript
import * as jwt from "jsonwebtoken";
import axios from "axios";

export interface CrazyTokenPayload {
  userId: string;
  gameId: string;
  username: string; // 6-20 chars (alfanumeric, period, underscores)
  profilePictureUrl: string;
}

export const DecodeCGToken = async (
  token: string,
): Promise<CrazyTokenPayload> => {
  let key = "";

  try {
    const resp = await axios.get("https://sdk.crazygames.com/publicKey.json");
    key = resp.data["publicKey"];
  } catch (e) {
    console.error("Failed to fetch CrazyGames public key", e);
  }

  if (!key) {
    throw new Error("Key is empty when decoding CrazyGames token");
  }

  const payload = jwt.verify(token, key, { algorithms: ["RS256"] });
  return payload as CrazyTokenPayload;
};
```

## Auth prompt

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

By calling this method, the log in or register popup will be displayed on CrazyGames. The user can log in their existing account, or create a new account. The method returns the user object.

```javascript
try {
  const user = await window.CrazyGames.SDK.user.showAuthPrompt();
  console.log("Auth prompt result", user);
} catch (e) {
  console.log("Error:", e);
}
```

The following errors can be returned:

- `showAuthPromptInProgress` - an auth prompt is already opened on the website
- `userAlreadySignedIn` - the user is already logged in
- `userCancelled` - the user closed the auth prompt without logging in or registering

## Auth listener

Guideline

You can register user auth listeners that are triggered when the player logs in CrazyGames. A log out doesn't trigger the auth listeners, since the entire page is refreshed when the player logs out.

```javascript
const listener = (user) => console.log("User changed", user);

// to add a listener
window.CrazyGames.SDK.user.addAuthListener(listener);

// to remove a listener
window.CrazyGames.SDK.user.removeAuthListener(listener);
```

After detecting a login using the Auth Listener, if you use the CrazyGames account as an identifier you should fetch the user's progress from your back-end.

If you rely on the [data module](https://docs.crazygames.com/sdk/data) or [automatic progress save](https://docs.crazygames.com/other/aps/), our system automatically reloads the game in case of a login.

## Account link prompt

Guideline

If you'd like to support advanced account use cases, you'll need to handle account linking between the CrazyGames account and the other providers. Check [User linking](https://docs.crazygames.com/sdk/user-linking) page to find out more about user account linking.

For requesting the user's permission to link their CrazyGames account to the in-game account, please use the provided account link modal and avoid implementing it yourself. This provides the players with a standard modal.

![Account link modal](https://docs.crazygames.com/img/html5/link-account-modal.png)

You can display the modal by calling the following method:

```javascript
try {
  const response = await window.CrazyGames.SDK.user.showAccountLinkPrompt();
  console.log("Link account response", response);
} catch (e) {
  console.log("Error:", e);
}
```

The response object will be either `{ "response": "yes" }` or `{ "response": "no" }`

The following error codes can be returned:

- `showAccountLinkPromptInProgress` - the link account modal is already displayed
- `userNotAuthenticated` - the user is not logged in CrazyGames

## Local Testing

[Basic Implementation](https://docs.crazygames.com/requirements/intro) [Full Implementation](https://docs.crazygames.com/requirements/intro)

When the SDK is in the `local` environment (on `127.0.0.1` or `localhost`) it will return some hardcoded default values for the method calls in the user module.

You can customize the returned local values by appending these query parameters:

- `?user_account_available=false` will change the response from the `isUserAccountAvailable` property to `false` (it returns `true` by default).
- `?show_auth_prompt_response=` will change the response from the `showAuthPrompt` method. It accepts the following values: `user1`, `user2`, `user_cancelled`
- `?link_account_response=` will change the response from the `showAccountLinkPrompt` method. It accepts the following values: `yes`, `no`, `logged_out`
- `?user_response=` will change the response from the `getUser` method. It accepts the following values: `user1`, `user2`, `logged_out`
- `?token_response=` will change the response from the `getUserToken` method. It accepts the following values: `user1`, `user2`, `expired_token` (to return an expired token), `logged_out`

By default, `getUser` returns `user1`, `getUserToken` returns token for `user1`, `showAccountLinkPrompt` returns `yes`, `showAuthPrompt` returns `user1`, and `isUserAccountAvailable` returns `true`.

The data module allows to save and retrieve user data for logged in CrazyGames users. The data will also be synced on all the devices where the user plays the game.

If the user is not logged in, the data module will store the game data in LocalStorage. If the user logs in later, the LocalStorage game data will be synced and backed up on the user's account.

Warning

If you intend to use the data module, don't forget to select the appropriate _Progress Save_ toggle in the submission flow. The data module will be disabled otherwise.

You need to fully rely on the Data Module save (for both guest and logged-in users on CrazyGames) and avoid relying on local saves to ensure the Data Module save works correctly.

## Using the data module

After reading our [SDK Introduction](https://docs.crazygames.com/sdk/intro/) page for your engine, follow these steps in order to use the `data` module.

**Initialization**

Before using any methods from the data module, please be sure the SDK is initialized.

```csharp
await window.CrazyGames.SDK.init();
```

We recommend that you do this during the loading screen of your game since the SDK preloads all the game data when it is initialized. This may take some time, depending on how much user data is stored.

**Usage**

The data module has the same API as the [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage):

```php
clear(): void;
getItem(key: string): string | null;
removeItem(key: string): void;
setItem(key: string, value: string): void;
```

You can call methods from the data module like this:

```javascript
window.CrazyGames.SDK.data.setItem("gold", 100);
```

Avoid losing user progress

In general, it's a good practice to always **retrieve** your data before **setting** data to ensure that the player's previous progress isn't lost.

## Errors

The data module can throw errors, for example:

```css
{
    "code": "dataLimitExcedeed",
    "message": "Game data when converted to a JSON string cannot exceed 1048576 bytes. Data was not saved"
}
```

Possible error codes:

- `dataLimitExcedeed` - you can store maximum 1MB of user data
- `dataModuleDisabled` - please be sure you selected the "Yes, using the Data Module from the CrazyGames SDK" option when submitting your game
- `other`

## Guest user behaviour

For guest users, the data module stores the game data in `localStorage`. When a guest user signs in, you don't need to do anything. Our SDK will automatically load the account game data if there is any, or if this user hasn't played your game before, the SDK will transfer the guest data to the user account.

When the user signs out, the SDK will revert back to using the guest game data.

## Data saving limits

The SDK debounces data saving with 1 second, meaning that multiple calls to the methods will be saved after 1 second. There may be exceptions in various cases, when data saving may be debounced with more time, up to 30 seconds.

There is a 1MB data limit. If you are approaching it, you will see warnings in the browser console. The data won't be backed up anymore if it exceeds 1MB.

## Help with the data module

If you're unsure on how to use the data module to save & load progress data, refer to the [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) which works identically to the Data module.

## Integrating data module into already published games

Since the `data` module offers the same API as `window.localStorage`, it is quite easy to integrate it into your already published games. To avoid players losing their data, you should copy all the existing `localStorage` keys into the `data` module if the user played your game before.
