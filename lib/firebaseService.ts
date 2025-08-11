import { db, auth } from './firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, orderBy, limit, where, getDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface SimulationData {
  R0: string;
  population_size: string;
  ifr: string;
  illness_length: string;
  network_size: string;
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

export interface LoadedSimulation {
  id: string;
  timestamp: Date;
  userId: string;
  parameters: {
    R0: number;
    population_size: number;
    ifr: number;
    illness_length: number;
    network_size?: number;
  };
  results: {
    infected: { [key: string]: number };
    deaths: { [key: string]: number };
    immune: { [key: string]: number };
  };
}

export interface LoadSimulationsResult {
  success: boolean;
  simulations?: LoadedSimulation[];
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  simulationCount: number;
}

export interface UserResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export const saveSimulationToFirebase = async (data: SimulationData): Promise<SimulationResult> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to save simulations'
      };
    }

    const simulationDoc = {
      userId: auth.currentUser.uid,
      timestamp: new Date(),
      parameters: {
        R0: parseFloat(data.R0),
        population_size: parseInt(data.population_size),
        ifr: parseFloat(data.ifr),
        illness_length: parseInt(data.illness_length),
        network_size: parseInt(data.network_size)
      },
      results: {
        infected: data.infected,
        deaths: data.deaths,
        immune: data.immune
      }
    };

    const docRef = await addDoc(collection(db, 'outbreak_simulations'), simulationDoc);
    
    // Increment user's simulation count
    await incrementUserSimulationCount(auth.currentUser.uid);
    
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


export const loadSimulationsFromFirebase = async (maxResults: number = 20): Promise<LoadSimulationsResult> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to load simulations'
      };
    }

    const simulationsRef = collection(db, 'outbreak_simulations');
    const q = query(
      simulationsRef, 
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'), 
      limit(maxResults)
    );
    const querySnapshot = await getDocs(q);
    
    const simulations: LoadedSimulation[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      simulations.push({
        id: doc.id,
        userId: data.userId,
        timestamp: data.timestamp.toDate(),
        parameters: data.parameters,
        results: data.results
      });
    });
    
    return {
      success: true,
      simulations
    };
  } catch (error) {
    return {
      success: false,
      error: `Firebase error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const createOrUpdateUserProfile = async (user: User): Promise<UserResult> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const userData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    };

    if (userSnap.exists()) {
      // Update existing user
      await setDoc(userRef, userData, { merge: true });
    } else {
      // Create new user
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        simulationCount: 0,
      });
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: userSnap.exists() ? userSnap.data().createdAt.toDate() : new Date(),
        lastLoginAt: new Date(),
        simulationCount: userSnap.exists() ? userSnap.data().simulationCount : 0,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create/update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const getUserProfile = async (uid: string): Promise<UserResult> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return {
        success: false,
        error: 'User profile not found'
      };
    }

    const data = userSnap.data();
    return {
      success: true,
      user: {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt.toDate(),
        lastLoginAt: data.lastLoginAt.toDate(),
        simulationCount: data.simulationCount,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const incrementUserSimulationCount = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      simulationCount: increment(1)
    }, { merge: true });
  } catch (error) {
    console.error('Failed to increment simulation count:', error);
  }
};

export const loadSimulationById = async (simulationId: string): Promise<LoadSimulationsResult> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to load simulations'
      };
    }

    const simulationsRef = collection(db, 'outbreak_simulations');
    const q = query(
      simulationsRef,
      where('userId', '==', auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    
    let foundSimulation: LoadedSimulation | null = null;
    
    querySnapshot.forEach((doc) => {
      if (doc.id === simulationId) {
        const data = doc.data();
        foundSimulation = {
          id: doc.id,
          userId: data.userId,
          timestamp: data.timestamp.toDate(),
          parameters: data.parameters,
          results: data.results
        };
      }
    });
    
    if (foundSimulation) {
      return {
        success: true,
        simulations: [foundSimulation]
      };
    } else {
      return {
        success: false,
        error: 'Simulation not found or access denied'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Firebase error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const deleteSimulationFromFirebase = async (simulationId: string): Promise<DeleteResult> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to delete simulations'
      };
    }

    // First, verify the simulation belongs to the current user
    const simulationRef = doc(db, 'outbreak_simulations', simulationId);
    const simulationSnap = await getDoc(simulationRef);

    if (!simulationSnap.exists()) {
      return {
        success: false,
        error: 'Simulation not found'
      };
    }

    const simulationData = simulationSnap.data();
    if (simulationData.userId !== auth.currentUser.uid) {
      return {
        success: false,
        error: 'Access denied - you can only delete your own simulations'
      };
    }

    // Delete the simulation
    await deleteDoc(simulationRef);

    // Decrement user's simulation count
    await decrementUserSimulationCount(auth.currentUser.uid);

    return {
      success: true,
      message: 'Simulation deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete simulation: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const decrementUserSimulationCount = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      simulationCount: increment(-1)
    }, { merge: true });
  } catch (error) {
    console.error('Failed to decrement simulation count:', error);
  }
};