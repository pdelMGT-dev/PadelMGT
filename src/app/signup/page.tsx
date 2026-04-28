'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Shield, Trophy, Star, Eye, EyeOff, Check } from 'lucide-react';
import { Suspense } from 'react';

type Role = 'player' | 'club_manager' | 'league_organizer' | 'federation';

const roles = [
  {
    id: 'player' as Role,
    label: 'Player',
    icon: <Users className="w-6 h-6" />,
    color: 'border-green-500 bg-green-50',
    activeColor: 'bg-green-500 text-white',
    description: 'Find matches, join tournaments, track your stats and connect with players.',
    features: ['Personal dashboard', 'Match history', 'Player rankings', 'QR code invites'],
  },
  {
    id: 'club_manager' as Role,
    label: 'Club Manager',
    icon: <Shield className="w-6 h-6" />,
    color: 'border-blue-500 bg-blue-50',
    activeColor: 'bg-blue-500 text-white',
    description: 'Manage your club, tournaments, and members. Upload player data and run events.',
    features: ['Club dashboard', 'Tournament creation', 'Staff management', 'Player uploads'],
  },
  {
    id: 'league_organizer' as Role,
    label: 'League Organizer',
    icon: <Trophy className="w-6 h-6" />,
    color: 'border-amber-500 bg-amber-50',
    activeColor: 'bg-amber-500 text-white',
    description: 'Run multi-week competitions across clubs with full league management.',
    features: ['League dashboard', 'Multi-club support', 'Schedule management', 'Standings'],
  },
  {
    id: 'federation' as Role,
    label: 'Federation',
    icon: <Star className="w-6 h-6" />,
    color: 'border-purple-500 bg-purple-50',
    activeColor: 'bg-purple-500 text-white',
    description: 'Manage national rankings, sanction tournaments, govern the sport.',
    features: ['National rankings', 'Tournament sanctioning', 'Multi-category', 'Reports'],
  },
];

function SignupForm() {
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get('role') as Role) || 'player';
  const [role, setRole] = useState<Role>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    country: '', city: '', clubName: '', phone: '',
  });

  const selectedRole = roles.find((r) => r.id === role)!;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-slate-900 mb-6">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            Padel<span className="text-green-600">MGT</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-2">Join thousands of padel players and organizers worldwide</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step ? 'bg-green-500 text-white' : s === step ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm ${s === step ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                {s === 1 ? 'Choose Role' : 'Your Details'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">I am a...</h2>
              <p className="text-slate-500 text-sm mb-6">Choose the account type that best describes you</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      role === r.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      role === r.id ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{r.label}</h3>
                    <p className="text-xs text-slate-500 mb-3">{r.description}</p>
                    <ul className="space-y-1">
                      {r.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-green-500 hover:bg-green-400 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Continue as {selectedRole.label} →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm mb-4">← Back</button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                  {selectedRole.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Details</h2>
                  <p className="text-sm text-slate-500">Registering as: <strong>{selectedRole.label}</strong></p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Carlos"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="García"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="carlos@example.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select country</option>
                      {['Spain', 'UK', 'France', 'Netherlands', 'UAE', 'Germany', 'Italy', 'USA', 'Other'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Your city"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {(role === 'club_manager' || role === 'league_organizer' || role === 'federation') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {role === 'club_manager' ? 'Club Name' : role === 'league_organizer' ? 'Organization Name' : 'Federation Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.clubName}
                      onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                      placeholder={role === 'club_manager' ? 'My Padel Club' : 'My Organization'}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-4">
                    By creating an account you agree to our{' '}
                    <Link href="/terms" className="text-green-600 hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>.
                  </p>
                  <button className="w-full bg-green-500 hover:bg-green-400 text-white py-3 rounded-xl font-bold text-lg transition-colors">
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
