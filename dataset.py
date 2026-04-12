import pandas as pd
import numpy as np

np.random.seed(42)

n = 1000

data = pd.DataFrame({
    "previous_score": np.random.randint(40, 100, n),
    "study_hours": np.random.uniform(1, 10, n),
    "distraction_time": np.random.uniform(0, 5, n),
    "lessons_completed": np.random.randint(1, 20, n),
    "sleep_hours": np.random.uniform(4, 9, n),
    "group_study": np.random.choice([0, 1], n),
    "learning_style": np.random.choice(["theory", "practice"], n)
})

data["effective_study"] = data["study_hours"] - data["distraction_time"]

data["score"] = (
    data["previous_score"] * 0.4 +
    data["effective_study"] * 5 +
    data["sleep_hours"] * 2 +
    data["lessons_completed"] * 1.5 +
    data["group_study"] * 3 +
    np.random.normal(0, 5, n)
)

data["score"] = data["score"].clip(0, 100)

print(data.head())
print(data.describe())
data.to_csv("data.csv", index=False)