'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveSimulationToFirebase, loadSimulationsFromFirebase, type SimulationData, type LoadedSimulation } from '../../lib/firebaseService';
import { useAuth } from '../../lib/auth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SimulationResult {
  infected: { [key: string]: number };
  deaths: { [key: string]: number };
  immune: { [key: string]: number };
}

export default function OutbreakSimulation() {
  const { user, signOut } = useAuth();
  const [formData, setFormData] = useState({
    R0: '',
    population_size: '',
    ifr: '',
    illness_length: '7'
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadedSimulations, setLoadedSimulations] = useState<LoadedSimulation[]>([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);
  const [showLoadedSimulations, setShowLoadedSimulations] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSaveMessage('');

    try {
      const params = new URLSearchParams({
        R0: formData.R0,
        population_size: formData.population_size,
        ifr: formData.ifr,
        illness_length: formData.illness_length
      });

      const response = await fetch(`http://localhost:5000/simulate_outbreak?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to connect to the API. Make sure the Flask server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSimulation = async () => {
    if (!result) {
      setSaveMessage('No simulation data to save');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const simulationData: SimulationData = {
        R0: formData.R0,
        population_size: formData.population_size,
        ifr: formData.ifr,
        illness_length: formData.illness_length,
        infected: result.infected,
        deaths: result.deaths,
        immune: result.immune
      };

      const saveResult = await saveSimulationToFirebase(simulationData);
      
      if (saveResult.success) {
        setSaveMessage(`✅ ${saveResult.message} (ID: ${saveResult.simulation_id})`);
      } else {
        setSaveMessage(`❌ ${saveResult.error}`);
      }
    } catch (error) {
      setSaveMessage(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSimulations = async () => {
    setLoadingSimulations(true);
    setError('');

    try {
      const loadResult = await loadSimulationsFromFirebase(10);
      
      if (loadResult.success && loadResult.simulations) {
        setLoadedSimulations(loadResult.simulations);
        setShowLoadedSimulations(true);
      } else {
        setError(loadResult.error || 'Failed to load simulations');
      }
    } catch (error) {
      setError(`Failed to load simulations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingSimulations(false);
    }
  };

  const handleSelectSimulation = (simulation: LoadedSimulation) => {
    // Load the simulation parameters into the form
    setFormData({
      R0: simulation.parameters.R0.toString(),
      population_size: simulation.parameters.population_size.toString(),
      ifr: simulation.parameters.ifr.toString(),
      illness_length: simulation.parameters.illness_length.toString()
    });

    // Load the simulation results
    setResult({
      infected: simulation.results.infected,
      deaths: simulation.results.deaths,
      immune: simulation.results.immune
    });

    // Close the loaded simulations panel
    setShowLoadedSimulations(false);
    setSaveMessage('');
  };

  const createChartData = (data: { [key: string]: number }, label: string, color: string) => {
    const days = Object.keys(data).map(Number).sort((a, b) => a - b);
    const values = days.map(day => data[day]);

    return {
      labels: days,
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: function(value: any) {
            return (value * 100).toFixed(1) + '%';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Days'
        }
      }
    },
  };

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-start p-8">
      <div className="w-full max-w-6xl">
        <div className="mb-8 flex justify-between items-center">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.displayName || user?.email}
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8">
          Outbreak Simulation
        </h1>

        {showLoadedSimulations && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Previous Simulations</h2>
              <button
                onClick={() => setShowLoadedSimulations(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadedSimulations.map((simulation) => (
                <div
                  key={simulation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectSimulation(simulation)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {simulation.timestamp.toLocaleDateString()} {simulation.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {simulation.id.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>R0: {simulation.parameters.R0}</div>
                    <div>Population: {simulation.parameters.population_size.toLocaleString()}</div>
                    <div>IFR: {(simulation.parameters.ifr * 100).toFixed(2)}%</div>
                    <div>Illness Length: {simulation.parameters.illness_length} days</div>
                  </div>
                </div>
              ))}
              
              {loadedSimulations.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No saved simulations found
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Simulation Parameters</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="R0" className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Reproduction Number (R0):
                </label>
                <input
                  type="number"
                  id="R0"
                  name="R0"
                  value={formData.R0}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0.1"
                  placeholder="e.g., 2.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Average number of people one infected person will infect
                </p>
              </div>

              <div>
                <label htmlFor="population_size" className="block text-sm font-medium text-gray-700 mb-2">
                  Population Size:
                </label>
                <input
                  type="number"
                  id="population_size"
                  name="population_size"
                  value={formData.population_size}
                  onChange={handleInputChange}
                  min="100"
                  placeholder="e.g., 10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total number of people in the simulation
                </p>
              </div>

              <div>
                <label htmlFor="ifr" className="block text-sm font-medium text-gray-700 mb-2">
                  Infection Fatality Rate (IFR):
                </label>
                <input
                  type="number"
                  id="ifr"
                  name="ifr"
                  value={formData.ifr}
                  onChange={handleInputChange}
                  step="0.001"
                  min="0"
                  max="1"
                  placeholder="e.g., 0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Probability of death for infected individuals (0-1)
                </p>
              </div>

              <div>
                <label htmlFor="illness_length" className="block text-sm font-medium text-gray-700 mb-2">
                  Illness Length (days):
                </label>
                <input
                  type="number"
                  id="illness_length"
                  name="illness_length"
                  value={formData.illness_length}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days a person remains infected
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Running Simulation...' : 'Run Simulation'}
              </button>
            </form>

            <div className="mt-4">
              <button
                onClick={handleLoadSimulations}
                disabled={loadingSimulations}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {loadingSimulations ? 'Loading...' : 'Load Previous Simulations'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Simulation Results</h2>
            
            {!result && !loading && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Run a simulation to see results
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Running simulation...</div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Simulation Results</h3>
                  <button
                    onClick={handleSaveSimulation}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save to Firebase'}
                  </button>
                </div>

                {saveMessage && (
                  <div className={`p-3 rounded-lg ${
                    saveMessage.includes('✅') 
                      ? 'bg-green-100 border border-green-400 text-green-700' 
                      : 'bg-red-100 border border-red-400 text-red-700'
                  }`}>
                    {saveMessage}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium mb-3">Infection Rate Over Time</h3>
                  <div className="h-64">
                    <Line
                      data={createChartData(result.infected, 'Infection Rate', '#ef4444')}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: {
                            display: true,
                            text: 'Percentage of Population Infected'
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Death Rate Over Time</h3>
                  <div className="h-64">
                    <Line
                      data={createChartData(result.deaths, 'Death Rate', '#1f2937')}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: {
                            display: true,
                            text: 'Percentage of Population Who Died'
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Immunity Rate Over Time</h3>
                  <div className="h-64">
                    <Line
                      data={createChartData(result.immune, 'Immunity Rate', '#059669')}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: {
                            display: true,
                            text: 'Percentage of Population Immune'
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}