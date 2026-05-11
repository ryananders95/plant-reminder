export function HelpScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="form">
      <header className="form-header">
        <button className="header-btn" onClick={onClose}>
          Close
        </button>
        <h2>Help</h2>
        <span className="header-btn header-btn-spacer" aria-hidden="true" />
      </header>

      <main className="form-body help-body">
        <h3 className="help-heading">How to use PlantPapi</h3>
        <p>
          The <strong>Today</strong> tab shows what needs attention. Plants with tasks that are
          due today or overdue appear as cards with task buttons. Tap a button (
          <span aria-hidden="true">💧</span> Water, <span aria-hidden="true">💦</span> Mist,{' '}
          <span aria-hidden="true">🍩</span> Fertilize) to mark it done. Overdue tasks have a red
          button with a day count. The <em>Coming Up</em> section lists tasks due in the next
          week — tap <em>Complete early</em> to do them ahead of schedule.
        </p>
        <p>
          The <strong>Plants</strong> tab is your full plant list, grouped by room. Tap{' '}
          <em>+ Add Plant</em> to add one. Tap any plant to edit its name, room, notes, photo,
          and schedules.
        </p>

        <h3 className="help-heading">Schedules</h3>
        <p>
          Each plant can have its own water, mist, and fertilize schedules — independently. Each
          task supports <strong>multiple schedule rules</strong>, useful for seasonal care.
        </p>
        <p>
          <strong>Example</strong>: water every 4 days in May-Aug, every 7 days in Sep-Apr.
        </p>
        <ol>
          <li>In the plant's edit form, enable Water. By default it's every 7 days, all year.</li>
          <li>
            Tap <em>+ Add another schedule</em>.
          </li>
          <li>Set the new rule to every 4 days.</li>
          <li>
            Tap the <em>May, Jun, Jul, Aug</em> chips on the new rule. They'll move from the first
            rule to the second one (months can only belong to one rule at a time).
          </li>
        </ol>
        <p>
          If a task isn't needed during some months (e.g., fertilizer in winter), simply leave
          those months unassigned to any rule.
        </p>

        <h3 className="help-heading">Photos</h3>
        <p>
          When editing a plant, tap <strong>📷 Take photo</strong> to snap a new picture with
          your camera, or <strong>🖼️ Choose photo</strong> to pick from your library. Photos
          are auto-resized so they don't bloat storage, and appear as small thumbnails next to
          the plant in the Today and Plants tabs. Tap <strong>Remove</strong> on the edit form
          to clear a photo.
        </p>

        <h3 className="help-heading">Install on your phone</h3>
        <p>
          The app works in a browser, but installing it to your home screen gives you offline
          access and the cleanest experience.
        </p>
        <ul>
          <li>
            <strong>Android (Chrome)</strong>: tap the install banner at the top of the app, or
            open Chrome's menu (<span aria-hidden="true">⋮</span>) →{' '}
            <strong>Install app</strong>.
          </li>
          <li>
            <strong>iPhone (Safari)</strong>: tap the Share icon, then{' '}
            <strong>Add to Home Screen</strong>.
          </li>
        </ul>
        <p>After installing, open the app from your home screen icon.</p>

        <h3 className="help-heading">Sync across devices</h3>
        <p>
          Sign in with the same Google account on each device — your plants and photos stay in
          sync. Each Google account has its own data, so friends and family can use the same URL
          with their own accounts.
        </p>

        <h3 className="help-heading">Daily reminders</h3>
        <p>
          Tap the <strong>⚙</strong> button in the header to open Settings, then turn on{' '}
          <em>Send a notification when plants need attention</em>. Pick a preferred time from
          the dropdown (half-hour slots, displayed in your local timezone). You'll only get a
          notification on days that have at least one plant due or overdue — never on quiet
          days.
        </p>
        <p>
          <strong>iPhone</strong>: you must install the app to your home screen first (Share →
          Add to Home Screen), then open it from the home screen, before notifications can
          work.
        </p>

        <h3 className="help-heading">Sign out</h3>
        <p>Tap your name in the top right corner of any screen to sign out.</p>
      </main>
    </div>
  );
}
