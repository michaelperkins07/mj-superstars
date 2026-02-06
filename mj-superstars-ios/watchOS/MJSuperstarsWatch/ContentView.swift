// ============================================================
// MJ's Superstars - Apple Watch App
// Quick mood logging and breathing exercises on your wrist
// ============================================================

import SwiftUI
import WatchKit
import HealthKit

// MARK: - Main App Entry
@main
struct MJSuperstarsWatchApp: App {
    @StateObject private var appState = WatchAppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// MARK: - App State
class WatchAppState: ObservableObject {
    @Published var currentMood: Int = 3
    @Published var todaysMoods: [MoodEntry] = []
    @Published var currentStreak: Int = 0
    @Published var lastSyncTime: Date?

    private let healthStore = HKHealthStore()
    private let connectivity = WatchConnectivityManager.shared

    init() {
        loadCachedData()
        requestHealthKitPermissions()
    }

    func loadCachedData() {
        // Load from UserDefaults for offline access
        if let data = UserDefaults.standard.data(forKey: "todaysMoods"),
           let moods = try? JSONDecoder().decode([MoodEntry].self, from: data) {
            todaysMoods = moods
        }
        currentStreak = UserDefaults.standard.integer(forKey: "currentStreak")
    }

    func saveMood(_ score: Int, note: String? = nil) {
        let entry = MoodEntry(score: score, timestamp: Date(), note: note)
        todaysMoods.append(entry)
        currentMood = score

        // Save locally
        if let data = try? JSONEncoder().encode(todaysMoods) {
            UserDefaults.standard.set(data, forKey: "todaysMoods")
        }

        // Sync to iPhone
        connectivity.sendMoodEntry(entry)

        // Log mindful minutes to HealthKit
        logMindfulMinutes(minutes: 1)
    }

    func requestHealthKitPermissions() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.categoryType(forIdentifier: .mindfulSession)!
        ]

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]

        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { _, _ in }
    }

    func logMindfulMinutes(minutes: Int) {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let mindfulType = HKObjectType.categoryType(forIdentifier: .mindfulSession)!
        let now = Date()
        let startDate = now.addingTimeInterval(-Double(minutes * 60))

        let sample = HKCategorySample(
            type: mindfulType,
            value: HKCategoryValue.notApplicable.rawValue,
            start: startDate,
            end: now
        )

        healthStore.save(sample) { _, _ in }
    }
}

// MARK: - Data Models
struct MoodEntry: Codable, Identifiable {
    let id: UUID
    let score: Int
    let timestamp: Date
    let note: String?

    init(score: Int, timestamp: Date, note: String? = nil) {
        self.id = UUID()
        self.score = score
        self.timestamp = timestamp
        self.note = note
    }
}

// MARK: - Main Content View
struct ContentView: View {
    @EnvironmentObject var appState: WatchAppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            MoodLogView()
                .tag(0)

            BreathingView()
                .tag(1)

            StatsView()
                .tag(2)
        }
        .tabViewStyle(.page)
    }
}

// MARK: - Mood Log View
struct MoodLogView: View {
    @EnvironmentObject var appState: WatchAppState
    @State private var selectedMood: Int = 3
    @State private var showConfirmation = false

    private let moodEmojis = ["😔", "😕", "😐", "🙂", "😊"]
    private let moodColors: [Color] = [
        .red.opacity(0.7),
        .orange.opacity(0.7),
        .yellow.opacity(0.7),
        .green.opacity(0.7),
        .mint.opacity(0.7)
    ]

    var body: some View {
        VStack(spacing: 12) {
            Text("How are you?")
                .font(.headline)
                .foregroundColor(.white)

            // Mood Emoji
            Text(moodEmojis[selectedMood - 1])
                .font(.system(size: 50))
                .animation(.spring(), value: selectedMood)

            // Mood Slider
            HStack(spacing: 4) {
                ForEach(1...5, id: \.self) { score in
                    Circle()
                        .fill(selectedMood >= score ? moodColors[score - 1] : Color.gray.opacity(0.3))
                        .frame(width: selectedMood == score ? 20 : 14, height: selectedMood == score ? 20 : 14)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3)) {
                                selectedMood = score
                            }
                            WKInterfaceDevice.current().play(.click)
                        }
                }
            }
            .padding(.vertical, 8)

            // Log Button
            Button(action: logMood) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Log")
                }
                .font(.body.bold())
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(moodColors[selectedMood - 1])
                .cornerRadius(20)
            }
            .buttonStyle(.plain)
        }
        .padding()
        .overlay {
            if showConfirmation {
                ConfirmationView(mood: selectedMood)
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    private func logMood() {
        WKInterfaceDevice.current().play(.success)
        appState.saveMood(selectedMood)

        withAnimation(.spring()) {
            showConfirmation = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                showConfirmation = false
            }
        }
    }
}

// MARK: - Confirmation View
struct ConfirmationView: View {
    let mood: Int

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(.green)

            Text("Logged!")
                .font(.headline)
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.9))
    }
}

// MARK: - Breathing Exercise View
struct BreathingView: View {
    @State private var isBreathing = false
    @State private var breathPhase: BreathPhase = .idle
    @State private var circleScale: CGFloat = 0.5
    @State private var elapsedSeconds = 0
    @State private var timer: Timer?

    enum BreathPhase: String {
        case idle = "Tap to Start"
        case inhale = "Breathe In"
        case hold = "Hold"
        case exhale = "Breathe Out"
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("Breathing")
                .font(.headline)
                .foregroundColor(.white)

            ZStack {
                // Outer ring
                Circle()
                    .stroke(Color.cyan.opacity(0.3), lineWidth: 4)
                    .frame(width: 100, height: 100)

                // Animated circle
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.cyan, .blue],
                            center: .center,
                            startRadius: 0,
                            endRadius: 50
                        )
                    )
                    .frame(width: 80, height: 80)
                    .scaleEffect(circleScale)
                    .animation(.easeInOut(duration: breathPhase == .hold ? 0.1 : 4), value: circleScale)

                // Timer
                if isBreathing {
                    Text("\(elapsedSeconds)s")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                        .offset(y: 60)
                }
            }

            Text(breathPhase.rawValue)
                .font(.body)
                .foregroundColor(.cyan)

            Button(action: toggleBreathing) {
                Image(systemName: isBreathing ? "stop.fill" : "play.fill")
                    .font(.title3)
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(isBreathing ? Color.red : Color.cyan)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding()
    }

    private func toggleBreathing() {
        isBreathing.toggle()

        if isBreathing {
            startBreathingCycle()
            WKInterfaceDevice.current().play(.start)
        } else {
            stopBreathing()
            WKInterfaceDevice.current().play(.stop)
        }
    }

    private func startBreathingCycle() {
        elapsedSeconds = 0
        breathPhase = .inhale
        circleScale = 1.0

        // Haptic on phase changes
        WKInterfaceDevice.current().play(.directionUp)

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            elapsedSeconds += 1

            // 4-7-8 breathing pattern
            let cycleSecond = elapsedSeconds % 19 // 4 + 7 + 8 = 19 seconds per cycle

            if cycleSecond == 0 {
                breathPhase = .inhale
                circleScale = 1.0
                WKInterfaceDevice.current().play(.directionUp)
            } else if cycleSecond == 4 {
                breathPhase = .hold
                WKInterfaceDevice.current().play(.click)
            } else if cycleSecond == 11 {
                breathPhase = .exhale
                circleScale = 0.5
                WKInterfaceDevice.current().play(.directionDown)
            }
        }
    }

    private func stopBreathing() {
        timer?.invalidate()
        timer = nil
        breathPhase = .idle
        circleScale = 0.5
        elapsedSeconds = 0
    }
}

// MARK: - Stats View
struct StatsView: View {
    @EnvironmentObject var appState: WatchAppState

    private var averageMood: Double {
        guard !appState.todaysMoods.isEmpty else { return 0 }
        return Double(appState.todaysMoods.reduce(0) { $0 + $1.score }) / Double(appState.todaysMoods.count)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Streak
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(appState.currentStreak)")
                        .font(.title2.bold())
                        .foregroundColor(.white)
                    Text("day streak")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding()
                .background(Color.orange.opacity(0.2))
                .cornerRadius(12)

                // Today's Stats
                VStack(spacing: 8) {
                    Text("Today")
                        .font(.caption)
                        .foregroundColor(.gray)

                    HStack(spacing: 20) {
                        VStack {
                            Text("\(appState.todaysMoods.count)")
                                .font(.title3.bold())
                                .foregroundColor(.cyan)
                            Text("logs")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }

                        VStack {
                            Text(String(format: "%.1f", averageMood))
                                .font(.title3.bold())
                                .foregroundColor(.green)
                            Text("avg")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.2))
                .cornerRadius(12)

                // Recent Moods
                if !appState.todaysMoods.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Recent")
                            .font(.caption)
                            .foregroundColor(.gray)

                        ForEach(appState.todaysMoods.suffix(3).reversed()) { mood in
                            HStack {
                                Text(moodEmoji(for: mood.score))
                                Text(formatTime(mood.timestamp))
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                }
            }
            .padding()
        }
    }

    private func moodEmoji(for score: Int) -> String {
        ["😔", "😕", "😐", "🙂", "😊"][max(0, min(4, score - 1))]
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Watch Connectivity Manager
class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    override init() {
        super.init()
        // WCSession setup would go here
    }

    func sendMoodEntry(_ entry: MoodEntry) {
        // Send to iPhone app via WatchConnectivity
        guard let data = try? JSONEncoder().encode(entry) else { return }

        let message: [String: Any] = [
            "type": "mood_entry",
            "data": data
        ]

        // In production, use WCSession.default.sendMessage
        print("Would send mood entry to iPhone: \(entry)")
    }
}

// MARK: - Complication Views
struct MoodComplicationView: View {
    let mood: Int

    private let moodEmojis = ["😔", "😕", "😐", "🙂", "😊"]

    var body: some View {
        Text(moodEmojis[max(0, min(4, mood - 1))])
            .font(.title)
    }
}

struct StreakComplicationView: View {
    let streak: Int

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "flame.fill")
                .foregroundColor(.orange)
            Text("\(streak)")
                .font(.headline)
        }
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(WatchAppState())
    }
}
