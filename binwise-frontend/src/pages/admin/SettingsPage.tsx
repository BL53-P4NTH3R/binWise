import { useState } from 'react'
import toast from 'react-hot-toast'
import { Btn, Input, Select } from '../../components/ui'

type Section = 'general' | 'sensors' | 'account'

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general')

  // General settings
  const [systemName, setSystemName] = useState('BinWise')
  const [campusName, setCampusName] = useState('Samaru Campus, ABU Zaria')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [collectionStart, setCollectionStart] = useState('07:00')
  const [pollingInterval, setPollingInterval] = useState('30')
  const [dataRetention, setDataRetention] = useState('90')

  // Sensors settings
  const [gsmProvider, setGsmProvider] = useState('MTN Nigeria')
  const [apn, setApn] = useState('web.gprs.mtnnigeria.net')
  const [heartbeatTimeout, setHeartbeatTimeout] = useState('60')
  const [defaultCapacity, setDefaultCapacity] = useState('240')

  // Account settings
  const userRaw = localStorage.getItem('bw_user')
  const user = userRaw ? JSON.parse(userRaw) as { full_name?: string; email?: string } : null
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  const handleReset = () => {
    if (section === 'general') {
      setSystemName('BinWise')
      setCampusName('Samaru Campus, ABU Zaria')
      setTimezone('Africa/Lagos')
      setCollectionStart('07:00')
      setPollingInterval('30')
      setDataRetention('90')
    }
    toast.success('Settings reset to defaults')
  }

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: 'general', label: 'General', icon: '⚙️' },
    { key: 'sensors', label: 'Sensors & Hardware', icon: '📡' },
    { key: 'account', label: 'Account', icon: '👤' },
  ]

  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section nav */}
        <div className="space-y-1">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-left transition-all ${
                section === s.key
                  ? 'bg-primary-50 text-primary border border-primary/20'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {section === 'general' && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">General Settings</h2>
                <p className="text-sm text-gray-500">Configure system-wide preferences</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="System Name" value={systemName} onChange={e => setSystemName(e.target.value)} />
                <Input label="Campus Name" value={campusName} onChange={e => setCampusName(e.target.value)} />
              </div>
              <Select
                label="Timezone"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                options={[
                  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, UTC+1)' },
                  { value: 'Africa/Accra', label: 'Africa/Accra (GMT, UTC+0)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Collection Start Time"
                  type="time"
                  value={collectionStart}
                  onChange={e => setCollectionStart(e.target.value)}
                />
                <Select
                  label="Polling Interval"
                  value={pollingInterval}
                  onChange={e => setPollingInterval(e.target.value)}
                  options={[
                    { value: '15', label: '15 seconds' },
                    { value: '30', label: '30 seconds' },
                    { value: '60', label: '1 minute' },
                    { value: '300', label: '5 minutes' },
                  ]}
                />
                <Select
                  label="Data Retention"
                  value={dataRetention}
                  onChange={e => setDataRetention(e.target.value)}
                  options={[
                    { value: '30', label: '30 days' },
                    { value: '90', label: '90 days' },
                    { value: '180', label: '180 days' },
                    { value: '365', label: '1 year' },
                  ]}
                />
              </div>
            </div>
          )}

          {section === 'sensors' && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Sensors & Hardware</h2>
                <p className="text-sm text-gray-500">Configure IoT hardware parameters</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="GSM Provider" value={gsmProvider} onChange={e => setGsmProvider(e.target.value)} />
                <Input label="APN" value={apn} onChange={e => setApn(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Heartbeat Timeout"
                  value={heartbeatTimeout}
                  onChange={e => setHeartbeatTimeout(e.target.value)}
                  options={[
                    { value: '30', label: '30 seconds' },
                    { value: '60', label: '1 minute' },
                    { value: '120', label: '2 minutes' },
                    { value: '300', label: '5 minutes' },
                  ]}
                />
                <Input
                  label="Default Bin Capacity (litres)"
                  type="number"
                  value={defaultCapacity}
                  onChange={e => setDefaultCapacity(e.target.value)}
                />
              </div>
            </div>
          )}

          {section === 'account' && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Account Settings</h2>
                <p className="text-sm text-gray-500">Manage your personal information</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Change Password</h3>
                <div className="space-y-4 max-w-sm">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    error={confirmPw && newPw !== confirmPw ? 'Passwords do not match' : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 mt-8 pt-5">
            <Btn variant="secondary" onClick={handleReset}>Reset</Btn>
            <Btn onClick={handleSave}>Save Changes</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
