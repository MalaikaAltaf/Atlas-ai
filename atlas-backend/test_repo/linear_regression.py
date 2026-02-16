"""
Linear Regression Implementation
A complete implementation of Linear Regression using gradient descent.
"""
import math


class LinearRegression:
    """
    Implements Linear Regression using Ordinary Least Squares 
    with gradient descent optimization.
    
    This is the simplest form of regression that fits a linear model
    to minimize the residual sum of squares between the observed targets
    and the predictions.
    """
    def __init__(self, learning_rate=0.01, n_iterations=1000):
        self.learning_rate = learning_rate
        self.n_iterations = n_iterations
        self.weights = None
        self.bias = None
        self.cost_history = []

    def fit(self, X, y):
        """
        Fit the linear regression model to training data.
        
        Args:
            X: Training features, list of lists (n_samples x n_features)
            y: Target values, list of floats (n_samples)
        """
        n_samples = len(X)
        n_features = len(X[0])
        
        # Initialize weights to zeros
        self.weights = [0.0] * n_features
        self.bias = 0.0

        for iteration in range(self.n_iterations):
            # Forward pass: compute predictions
            y_predicted = self.predict(X)

            # Compute cost (Mean Squared Error)
            cost = sum((y_predicted[i] - y[i]) ** 2 for i in range(n_samples)) / (2 * n_samples)
            self.cost_history.append(cost)

            # Compute gradients
            dw = [0.0] * n_features
            db = 0.0
            for i in range(n_samples):
                error = y_predicted[i] - y[i]
                for j in range(n_features):
                    dw[j] += error * X[i][j]
                db += error
            
            dw = [d / n_samples for d in dw]
            db /= n_samples

            # Update parameters
            for j in range(n_features):
                self.weights[j] -= self.learning_rate * dw[j]
            self.bias -= self.learning_rate * db

    def predict(self, X):
        """
        Predict target values for input features.
        
        Args:
            X: Input features (n_samples x n_features)
        Returns:
            List of predicted values
        """
        predictions = []
        for sample in X:
            y_pred = sum(w * x for w, x in zip(self.weights, sample)) + self.bias
            predictions.append(y_pred)
        return predictions

    def score(self, X, y):
        """
        Compute R-squared score (coefficient of determination).
        
        Args:
            X: Test features
            y: True target values
        Returns:
            R-squared score (1.0 = perfect fit)
        """
        y_pred = self.predict(X)
        ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(len(y)))
        y_mean = sum(y) / len(y)
        ss_tot = sum((y[i] - y_mean) ** 2 for i in range(len(y)))
        return 1 - (ss_res / ss_tot) if ss_tot != 0 else 0


class PolynomialRegression:
    """
    Polynomial Regression transforms features into polynomial features
    and applies linear regression on them.
    """
    def __init__(self, degree=2, learning_rate=0.01, n_iterations=1000):
        self.degree = degree
        self.model = LinearRegression(learning_rate, n_iterations)

    def _transform(self, X):
        """
        Transform features into polynomial features.
        For each feature x, creates [x, x^2, ..., x^degree].
        """
        X_poly = []
        for sample in X:
            poly_features = []
            for x in sample:
                for d in range(1, self.degree + 1):
                    poly_features.append(x ** d)
            X_poly.append(poly_features)
        return X_poly

    def fit(self, X, y):
        """Fit polynomial regression model."""
        X_poly = self._transform(X)
        self.model.fit(X_poly, y)

    def predict(self, X):
        """Predict using polynomial features."""
        X_poly = self._transform(X)
        return self.model.predict(X_poly)


class RidgeRegression:
    """
    Ridge Regression (L2 Regularization).
    Adds a penalty term to prevent overfitting by constraining
    the magnitude of the weights.
    """
    def __init__(self, learning_rate=0.01, n_iterations=1000, alpha=1.0):
        self.learning_rate = learning_rate
        self.n_iterations = n_iterations
        self.alpha = alpha  # Regularization strength
        self.weights = None
        self.bias = None

    def fit(self, X, y):
        """
        Fit ridge regression with L2 regularization.
        """
        n_samples = len(X)
        n_features = len(X[0])
        self.weights = [0.0] * n_features
        self.bias = 0.0

        for _ in range(self.n_iterations):
            y_predicted = self.predict(X)

            # Gradients with L2 penalty
            dw = [0.0] * n_features
            db = 0.0
            for i in range(n_samples):
                error = y_predicted[i] - y[i]
                for j in range(n_features):
                    dw[j] += error * X[i][j]
                db += error

            for j in range(n_features):
                dw[j] = dw[j] / n_samples + (self.alpha * self.weights[j]) / n_samples
            db /= n_samples

            for j in range(n_features):
                self.weights[j] -= self.learning_rate * dw[j]
            self.bias -= self.learning_rate * db

    def predict(self, X):
        """Predict using ridge regression model."""
        predictions = []
        for sample in X:
            y_pred = sum(w * x for w, x in zip(self.weights, sample)) + self.bias
            predictions.append(y_pred)
        return predictions
