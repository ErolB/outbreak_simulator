import { db } from './firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export interface SimulationData {
  R0: string;
  population_size: string;
  ifr: string;
  illness_length: string;
  infected: { [key: string]: number };
  deaths: { [key: string]: number };
  immune: { [key: string]: number };
}

export interface SimulationResult {
  success: boolean;
  simulation_id?: string;
  message?: string;
  error?: string;
}

export const saveSimulationToFirebase = async (data: SimulationData): Promise<SimulationResult> => {
  try {
    // Save via Flask backend to ensure proper server-side validation and processing
    const response = await fetch('http://localhost:5000/save_simulation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        simulation_id: result.simulation_id,
        message: result.message
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to save simulation'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const saveSimulationDirectly = async (data: SimulationData): Promise<SimulationResult> => {
  try {
    const simulationDoc = {
      timestamp: new Date(),
      parameters: {
        R0: parseFloat(data.R0),
        population_size: parseInt(data.population_size),
        ifr: parseFloat(data.ifr),
        illness_length: parseInt(data.illness_length)
      },
      results: {
        infected: data.infected,
        deaths: data.deaths,
        immune: data.immune
      }
    };

    const docRef = await addDoc(collection(db, 'outbreak_simulations'), simulationDoc);
    
    return {
      success: true,
      simulation_id: docRef.id,
      message: 'Simulation saved successfully to Firebase'
    };
  } catch (error) {
    return {
      success: false,
      error: `Firebase error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};