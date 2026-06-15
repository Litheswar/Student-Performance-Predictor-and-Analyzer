import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

def train_model():
    print("Loading dataset...")
    df = pd.read_csv("data.csv")

    # Preprocess categorical variable 'learning_style'
    # 'theory' -> 0, 'practice' -> 1
    df['learning_style_encoded'] = df['learning_style'].map({'theory': 0, 'practice': 1})

    # Define features and target
    # We include all base features that a user can input
    feature_cols = [
        'previous_score', 
        'study_hours', 
        'distraction_time', 
        'lessons_completed', 
        'sleep_hours', 
        'group_study', 
        'learning_style_encoded'
    ]
    
    X = df[feature_cols]
    y = df['score']

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training on {X_train.shape[0]} samples, testing on {X_test.shape[0]} samples...")

    # Train Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"Model Evaluation:")
    print(f"  Mean Absolute Error (MAE): {mae:.4f}")
    print(f"  Mean Squared Error (MSE):  {mse:.4f}")
    print(f"  R-squared Score (R2):      {r2:.4f}")

    # Calculate feature importances
    importances = model.feature_importances_
    for col, imp in zip(feature_cols, importances):
        print(f"  Feature '{col}': Importance = {imp:.4f}")

    # Save model and columns
    model_data = {
        'model': model,
        'features': feature_cols,
        'metrics': {
            'mae': mae,
            'mse': mse,
            'r2': r2
        }
    }
    
    joblib.dump(model_data, "student_model.joblib")
    print("Model saved to student_model.joblib")

if __name__ == "__main__":
    train_model()
