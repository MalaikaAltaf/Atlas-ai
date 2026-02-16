"""
Data Utilities
Common data processing functions for machine learning pipelines.
"""
import math
import random


def normalize(data):
    """
    Min-Max normalization to scale features to [0, 1] range.
    
    Args:
        data: List of numerical values
    Returns:
        Normalized list
    """
    min_val = min(data)
    max_val = max(data)
    if max_val == min_val:
        return [0.0] * len(data)
    return [(x - min_val) / (max_val - min_val) for x in data]


def standardize(data):
    """
    Z-score standardization (zero mean, unit variance).
    
    Args:
        data: List of numerical values
    Returns:
        Standardized list
    """
    mean = sum(data) / len(data)
    variance = sum((x - mean) ** 2 for x in data) / len(data)
    std = math.sqrt(variance) if variance > 0 else 1.0
    return [(x - mean) / std for x in data]


def train_test_split(X, y, test_size=0.2, seed=42):
    """
    Split data into training and testing sets.
    
    Args:
        X: Feature matrix (list of lists)
        y: Target values (list)
        test_size: Proportion of data for testing (0.0 to 1.0)
        seed: Random seed for reproducibility
    Returns:
        X_train, X_test, y_train, y_test
    """
    random.seed(seed)
    n = len(X)
    indices = list(range(n))
    random.shuffle(indices)
    
    split_idx = int(n * (1 - test_size))
    train_idx = indices[:split_idx]
    test_idx = indices[split_idx:]
    
    X_train = [X[i] for i in train_idx]
    X_test = [X[i] for i in test_idx]
    y_train = [y[i] for i in train_idx]
    y_test = [y[i] for i in test_idx]
    
    return X_train, X_test, y_train, y_test


def mean_squared_error(y_true, y_pred):
    """
    Compute Mean Squared Error between true and predicted values.
    
    Args:
        y_true: True target values
        y_pred: Predicted values
    Returns:
        MSE value
    """
    n = len(y_true)
    return sum((y_true[i] - y_pred[i]) ** 2 for i in range(n)) / n


def accuracy(y_true, y_pred):
    """
    Compute classification accuracy.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
    Returns:
        Accuracy as a float between 0 and 1
    """
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    return correct / len(y_true)


def confusion_matrix(y_true, y_pred, n_classes=2):
    """
    Build a confusion matrix for classification results.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        n_classes: Number of classes
    Returns:
        2D list (matrix) of shape [n_classes x n_classes]
    """
    matrix = [[0] * n_classes for _ in range(n_classes)]
    for t, p in zip(y_true, y_pred):
        matrix[t][p] += 1
    return matrix


def one_hot_encode(labels, n_classes):
    """
    One-hot encode categorical labels.
    
    Args:
        labels: List of integer labels
        n_classes: Total number of classes
    Returns:
        List of one-hot encoded vectors
    """
    encoded = []
    for label in labels:
        vec = [0] * n_classes
        vec[label] = 1
        encoded.append(vec)
    return encoded


def batch_iterator(X, y, batch_size=32):
    """
    Generate mini-batches for stochastic gradient descent.
    
    Args:
        X: Feature matrix
        y: Target values
        batch_size: Size of each mini-batch
    Yields:
        Tuples of (X_batch, y_batch)
    """
    n = len(X)
    indices = list(range(n))
    random.shuffle(indices)
    
    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        batch_idx = indices[start:end]
        yield [X[i] for i in batch_idx], [y[i] for i in batch_idx]
