from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# Load model assets
MODEL_PATH = "student_model.joblib"
if os.path.exists(MODEL_PATH):
    model_data = joblib.load(MODEL_PATH)
    model = model_data['model']
    features = model_data['features']
    metrics = model_data['metrics']
else:
    model = None
    features = []
    metrics = {}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not trained or loaded yet.'}), 500
    
    try:
        data = request.json
        
        # Extract features
        previous_score = float(data.get('previous_score', 70))
        study_hours = float(data.get('study_hours', 5.0))
        distraction_time = float(data.get('distraction_time', 2.0))
        lessons_completed = float(data.get('lessons_completed', 10))
        sleep_hours = float(data.get('sleep_hours', 7.0))
        group_study = int(data.get('group_study', 0))
        learning_style = data.get('learning_style', 'theory')
        
        learning_style_encoded = 1 if learning_style == 'practice' else 0
        
        # Prepare input array
        input_data = pd.DataFrame([{
            'previous_score': previous_score,
            'study_hours': study_hours,
            'distraction_time': distraction_time,
            'lessons_completed': lessons_completed,
            'sleep_hours': sleep_hours,
            'group_study': group_study,
            'learning_style_encoded': learning_style_encoded
        }])
        
        # Predict
        predicted_score = float(model.predict(input_data)[0])
        predicted_score = max(0.0, min(100.0, predicted_score)) # clip
        
        # Generate custom feedback recommendations
        recommendations = []
        if sleep_hours < 7:
            recommendations.append({
                'category': 'Sleep',
                'text': 'Your sleep hours are below the recommended 7-9 hours. Adequate sleep improves memory consolidation and cognitive function.',
                'impact': 'high'
            })
        if distraction_time > 2.5:
            recommendations.append({
                'category': 'Distractions',
                'text': 'Distraction time is relatively high. Try using the Pomodoro technique or website blockers to stay focused.',
                'impact': 'high'
            })
        if study_hours < 4:
            recommendations.append({
                'category': 'Study Habits',
                'text': 'Study hours are low. Increasing active study by just 1-2 hours per day can significantly boost performance.',
                'impact': 'high'
            })
        if group_study == 0:
            recommendations.append({
                'category': 'Collaboration',
                'text': 'You are currently studying alone. Try studying in groups; sharing concepts helps reinforce your own understanding.',
                'impact': 'medium'
            })
        if previous_score < 60 and lessons_completed < 10:
            recommendations.append({
                'category': 'Curriculum Completion',
                'text': 'Focus on completing more lessons to build core subject knowledge.',
                'impact': 'high'
            })
        
        if not recommendations:
            recommendations.append({
                'category': 'General',
                'text': 'Keep up the good work! Your current habits and metrics indicate a strong performance projection.',
                'impact': 'low'
            })
            
        return jsonify({
            'predicted_score': round(predicted_score, 2),
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    if not os.path.exists("data.csv"):
        return jsonify({'error': 'Dataset not found.'}), 404
        
    df = pd.read_csv("data.csv")
    
    # Preprocess categorical variable to get correlation
    df_numeric = df.copy()
    df_numeric['learning_style'] = df_numeric['learning_style'].map({'theory': 0, 'practice': 1})
    
    # Calculate correlation matrix
    corr_matrix = df_numeric.corr().to_dict()
    
    # Prepare correlation list for charts
    corr_data = {}
    for col in corr_matrix.keys():
        corr_data[col] = corr_matrix[col]['score']
        
    # Get dataset stats
    stats = df.describe().to_dict()
    
    # Feature importances from model
    feature_importances = {}
    if model:
        importances = model.feature_importances_
        feature_importances = {feat: float(imp) for feat, imp in zip(features, importances)}
        
    return jsonify({
        'stats': stats,
        'correlation_with_score': corr_data,
        'feature_importances': feature_importances,
        'model_metrics': metrics
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
