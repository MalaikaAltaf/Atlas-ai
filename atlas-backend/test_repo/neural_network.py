"""
Neural Network Implementation
A simple feedforward neural network built from scratch.
"""
import math
import random


class Neuron:
    """
    A single neuron with weights, bias, and activation.
    """
    def __init__(self, n_inputs):
        self.weights = [random.uniform(-1, 1) for _ in range(n_inputs)]
        self.bias = random.uniform(-1, 1)
        self.output = 0.0
        self.delta = 0.0

    def activate(self, inputs):
        """Compute weighted sum of inputs."""
        total = sum(w * x for w, x in zip(self.weights, inputs)) + self.bias
        self.output = self._sigmoid(total)
        return self.output

    @staticmethod
    def _sigmoid(x):
        """Sigmoid activation function."""
        return 1.0 / (1.0 + math.exp(-max(-500, min(500, x))))

    def sigmoid_derivative(self):
        """Derivative of sigmoid for backpropagation."""
        return self.output * (1.0 - self.output)


class Layer:
    """
    A layer of neurons in the neural network.
    """
    def __init__(self, n_neurons, n_inputs_per_neuron):
        self.neurons = [Neuron(n_inputs_per_neuron) for _ in range(n_neurons)]

    def forward(self, inputs):
        """Forward pass through the layer."""
        return [neuron.activate(inputs) for neuron in self.neurons]


class NeuralNetwork:
    """
    A feedforward neural network with backpropagation.
    
    Supports multiple hidden layers with sigmoid activation.
    Uses stochastic gradient descent for training.
    """
    def __init__(self, layer_sizes):
        """
        Initialize the network.
        
        Args:
            layer_sizes: List of integers, e.g. [2, 4, 1] means
                         2 inputs, 4 hidden neurons, 1 output
        """
        self.layers = []
        for i in range(1, len(layer_sizes)):
            self.layers.append(Layer(layer_sizes[i], layer_sizes[i - 1]))

    def forward(self, inputs):
        """
        Forward propagation through the entire network.
        
        Args:
            inputs: Input values
        Returns:
            Output of the final layer
        """
        current = inputs
        for layer in self.layers:
            current = layer.forward(current)
        return current

    def backward(self, expected):
        """
        Backpropagation: compute error gradients for all neurons.
        
        Args:
            expected: Expected output values
        """
        # Output layer errors
        output_layer = self.layers[-1]
        for i, neuron in enumerate(output_layer.neurons):
            error = expected[i] - neuron.output
            neuron.delta = error * neuron.sigmoid_derivative()

        # Hidden layer errors (propagate backwards)
        for i in range(len(self.layers) - 2, -1, -1):
            layer = self.layers[i]
            next_layer = self.layers[i + 1]
            for j, neuron in enumerate(layer.neurons):
                error = sum(
                    next_neuron.weights[j] * next_neuron.delta
                    for next_neuron in next_layer.neurons
                )
                neuron.delta = error * neuron.sigmoid_derivative()

    def update_weights(self, inputs, learning_rate):
        """
        Update weights using computed deltas (gradient descent step).
        
        Args:
            inputs: Original input to the network
            learning_rate: Step size for weight updates
        """
        for i, layer in enumerate(self.layers):
            if i == 0:
                layer_inputs = inputs
            else:
                layer_inputs = [n.output for n in self.layers[i - 1].neurons]

            for neuron in layer.neurons:
                for j in range(len(neuron.weights)):
                    neuron.weights[j] += learning_rate * neuron.delta * layer_inputs[j]
                neuron.bias += learning_rate * neuron.delta

    def train(self, X, y, learning_rate=0.5, epochs=1000):
        """
        Train the neural network on a dataset.
        
        Args:
            X: Training features (list of input vectors)
            y: Target outputs (list of output vectors)
            learning_rate: Learning rate for gradient descent
            epochs: Number of training iterations
        """
        for epoch in range(epochs):
            total_error = 0.0
            for inputs, expected in zip(X, y):
                # Forward pass
                outputs = self.forward(inputs)
                
                # Compute error
                total_error += sum(
                    (expected[i] - outputs[i]) ** 2
                    for i in range(len(expected))
                )
                
                # Backward pass
                self.backward(expected)
                
                # Update weights
                self.update_weights(inputs, learning_rate)

    def predict(self, inputs):
        """
        Make a prediction for a single input.
        
        Args:
            inputs: Input feature vector
        Returns:
            Output prediction vector
        """
        return self.forward(inputs)


def relu(x):
    """Rectified Linear Unit activation function."""
    return max(0, x)


def softmax(values):
    """
    Softmax activation function for multi-class classification.
    Converts raw scores to probabilities that sum to 1.
    """
    max_val = max(values)
    exp_values = [math.exp(v - max_val) for v in values]
    total = sum(exp_values)
    return [v / total for v in exp_values]


def cross_entropy_loss(predicted, actual):
    """
    Cross-entropy loss function for classification.
    
    Args:
        predicted: Predicted probabilities
        actual: One-hot encoded true labels
    Returns:
        Loss value
    """
    epsilon = 1e-15
    return -sum(
        a * math.log(max(p, epsilon))
        for p, a in zip(predicted, actual)
    )
