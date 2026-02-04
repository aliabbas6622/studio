# **App Name**: RapidShare Local

## Core Features:

- Device Discovery: Automatically discover devices on the local WiFi network using UDP broadcast. Devices broadcast their presence every 2-3 seconds and maintain an active peer list, removing devices not heard from within 5 seconds.
- File Selection: Allow users to select multiple files for transfer from their device storage using the file_picker package.
- Parallel File Transfer: Split files larger than 100MB into 8-10 chunks and transfer them simultaneously over separate TCP connections. Send chunk metadata (index, offset, size) before streaming data.
- Transfer Management UI: Display a list of discovered devices and active/recent transfers with progress bars, transfer speed, and ETA. Allow users to initiate transfers by tapping on a device and selecting files.
- Retry and Resume: Automatically retry failed transfers up to 3 times with 2-second delays. Save transfer state to disk and only resend incomplete chunks on retry. Allow resuming transfers across app restarts.
- Background Transfers: Enable transfers to continue even when the app is minimized using flutter_background_service. Show a persistent notification during active transfers and maintain transfer state for resuming if the app is killed.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to evoke reliability and stability, befitting the data transfer purpose.
- Background color: Light gray (#F0F0F0) for a clean and modern interface.
- Accent color: Teal (#009688) to highlight interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif known for its clean, modern, neutral appearance, well-suited to on-screen reading.
- Use clear and intuitive icons for file types, transfer status, and device selection.
- Employ a simple, list-based layout for displaying devices and transfers, focusing on clarity and ease of use.
- Subtle animations on progress bars and state transitions for user feedback.