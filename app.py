from flask import Flask, request, jsonify
from utils import *

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

if __name__ == '__main__':
    app.run(debug=True)