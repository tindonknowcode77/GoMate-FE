# Android Emulator location and Match

## API and Metro connections

Run `npm run dev:api` and `npm run dev:android` in separate terminals at the parent
workspace root. Keep the API terminal running; wait until it reports port 3000
before using the app. The Android command starts Metro with `--localhost`, using
ADB for the JavaScript connection. Metro and the API are separate services.

Start the emulator in Android Studio first and install Expo Go. The root Android
launcher starts Metro without Expo's automatic Android device-name lookup, then
uses bounded ADB commands to reverse 8081 and launch Expo Go on online devices.
This avoids `adb emu avd name` hanging/failing when emulator console ports are
unavailable. `ANDROID_SERIAL` optionally selects a single connected device.
Use `npm run android:open` to reconnect an emulator to the already running Metro;
do not start a second Metro process. Device errors leave Metro running.

The local configuration uses `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api`.
In Android development, the URL resolver maps loopback hosts (`localhost`,
`127.0.0.1`, `[::1]`) to `10.0.2.2`, the emulator's alias for the PC loopback.
This also handles a loopback Metro host or relative `/api` configuration.
Explicit LAN/cloud API addresses are retained. Physical Android devices need an
explicit reachable LAN/cloud URL; they cannot use the emulator-only alias.
Web, iOS and production explicit URLs are unaffected. Reload the app after changing
its API configuration.

`npm run dev:all` builds web before starting the API and replaces the process on
port 3000. Running it again temporarily disconnects API clients; for native-only
work, keep the API and Metro running using the two commands above.

## Location

Entering Match automatically requests foreground location and displays **Đang lấy
vị trí GPS của bạn**. Grant permission when prompted. There is no need to open
the filter to start GPS. Match uses the searcher's GPS and each event's pin;
host profile locations do not affect distance. Filters offer **Cập nhật vị trí
GPS** to retry acquisition. After GPS failure, 50 km+ can still search within the
selected region; a finite radius or nearest sort requires GPS.

Drag the radius slider directly from 1 to 49 km. **50 km+** removes the distance
cap while retaining the selected province/city and any district/ward filters.
All provinces explicitly includes all regions. Finite radius excludes unpinned
events, while unlimited region-only discovery can include them.

Enable **Settings → Location** inside the emulator and allow foreground location
for GoMate (or Expo Go when running through Expo Go).

The emulator receives a simulated location; it does not use the laptop's physical
GPS. Open the emulator's **More (…) → Extended controls → Location → Single
points**, choose a point, then click **Set location**. For a point in central
Ho Chi Minh City use latitude `10.7769`, longitude `106.7009`. Return to Match's
filter and press **Cập nhật vị trí GPS**. If Extended controls is unavailable in
Android Studio's embedded emulator, open the emulator in a separate window.

Location acquisition first accepts an OS-cached fix at most 60 seconds old with
accuracy within 200 metres. Otherwise it requests a fresh fix (High accuracy on
Android to include GPS) with a 12-second timeout. Permission denial, disabled
services and missing fixes have separate messages. Coordinates remain local to
the current session. Activity creation/editing still allows event-pin selection
on the map, independently of the searcher's GPS.

Match keeps the current discovery page while filters or another screen are open,
then refreshes it when returning. Changing filters hides previous-query results.
The Match header/filter button remains available while the first page is loading.
Activity maps are mounted only after pressing **Xem bản đồ địa điểm**, avoiding
WebView startup for every new card.

Read requests retry one transport failure automatically without extending the
original timeout; HTTP failures and writes do not retry. Failed startup Match
preferences are refreshed once on entry. After changes to feedback hook state,
press **r** in Metro for a full reload instead of relying only on Fast Refresh.

References:

- [Android Emulator location controls](https://developer.android.com/studio/run/emulator-extended-controls#location)
- [Expo SDK 57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
