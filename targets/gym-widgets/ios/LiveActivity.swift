import ActivityKit
import SwiftUI
import WidgetKit

/// User-owned Live Activity UI — safe to edit; prebuild will not overwrite.
/// Attributes type `GymWidgetsAttributes` is CNG-generated into
/// ios/*/ExpoTargetsGenerated/ from targets/gym-widgets/target.config.json:
///   attributes: title (String)
///   contentState: startedAt (Double, epoch seconds), completed (Double), total (Double)
struct GymWidgetsLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: GymWidgetsAttributes.self) { context in
      // MARK: - Lock Screen
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text(context.attributes.title)
            .font(.headline)
          Spacer()
          Text(Date(timeIntervalSince1970: context.state.startedAt), style: .timer)
            .font(.headline)
            .monospacedDigit()
        }
        ProgressView(
          value: context.state.completed,
          total: max(context.state.total, 1)
        )
        .tint(.green)
        Text("\(Int(context.state.completed)) of \(Int(context.state.total)) exercises")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        // MARK: - Expanded
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.title)
              .font(.headline)
            Text("\(Int(context.state.completed))/\(Int(context.state.total))")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(Date(timeIntervalSince1970: context.state.startedAt), style: .timer)
            .font(.title2)
            .monospacedDigit()
        }
        DynamicIslandExpandedRegion(.center) {
          ProgressView(
            value: context.state.completed,
            total: max(context.state.total, 1)
          )
          .tint(.green)
        }
      } compactLeading: {
        Text(Date(timeIntervalSince1970: context.state.startedAt), style: .timer)
          .font(.caption)
          .monospacedDigit()
          .frame(maxWidth: 52)
      } compactTrailing: {
        Text("\(Int(context.state.completed))/\(Int(context.state.total))")
          .font(.caption2)
          .monospacedDigit()
      } minimal: {
        Image(systemName: "flame.fill")
      }
    }
  }
}
