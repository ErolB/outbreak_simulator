from flask import Flask, request, jsonify
from utils import *
from firebase_config import get_firestore_client
from datetime import datetime
import uuid

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/herd_immunity', methods=['GET'])
def herd_immunity():
    try:
        R0 = float(request.args.get('R0'))
        
        if R0 <= 0:
            return jsonify({'error': 'R0 must be greater than 0'}), 400
        
        herd_immunity_threshold = 1 - (1 / R0)
        
        return jsonify({
            'R0': R0,
            'herd_immunity_threshold': herd_immunity_threshold
        })
    
    except (TypeError, ValueError):
        return jsonify({'error': 'R0 parameter is required and must be a valid number'}), 400

@app.route('/simulate_outbreak', methods=['GET'])
def simulate_outbreak():
    try:
        R0 = float(request.args.get('R0'))
        population_size = int(request.args.get('population_size'))
        ifr = float(request.args.get('ifr'))
        illness_length = int(request.args.get('illness_length', 7))  # default to 7 days
        
        if R0 <= 0:
            return jsonify({'error': 'R0 must be greater than 0'}), 400
        if population_size <= 0:
            return jsonify({'error': 'population_size must be greater than 0'}), 400
        if ifr < 0 or ifr > 1:
            return jsonify({'error': 'ifr must be between 0 and 1'}), 400
        if illness_length <= 0:
            return jsonify({'error': 'illness_length must be greater than 0'}), 400
        
        outbreak = OutBreak(R0, ifr, illness_length, population_size)
        result = outbreak.run()
        
        return jsonify(result)
    
    except (TypeError, ValueError):
        return jsonify({'error': 'Required parameters: R0, population_size, ifr. Optional: illness_length (default 7)'}), 400

@app.route('/save_simulation', methods=['POST'])
def save_simulation():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Generate a unique ID for this simulation
        simulation_id = str(uuid.uuid4())
        
        # Prepare the document to save
        simulation_doc = {
            'id': simulation_id,
            'timestamp': datetime.utcnow(),
            'parameters': {
                'R0': data.get('R0'),
                'population_size': data.get('population_size'),
                'ifr': data.get('ifr'),
                'illness_length': data.get('illness_length')
            },
            'results': {
                'infected': data.get('infected', {}),
                'deaths': data.get('deaths', {}),
                'immune': data.get('immune', {})
            }
        }
        
        # Save to Firestore
        db = get_firestore_client()
        db.collection('outbreak_simulations').document(simulation_id).set(simulation_doc)
        
        return jsonify({
            'success': True,
            'simulation_id': simulation_id,
            'message': 'Simulation saved successfully'
        })
    
    except Exception as e:
        return jsonify({'error': f'Failed to save simulation: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)