import math

class AdamOptimizer:
    """
    Implements Adam algorithm.
    It has been proposed in Adam: A Method for Stochastic Optimization.
    """
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8):
        self.params = params
        self.lr = lr
        self.betas = betas
        self.eps = eps
        self.m = [0] * len(params)
        self.v = [0] * len(params)
        self.t = 0

    def step(self):
        """
        Performs a single optimization step.
        """
        self.t += 1
        for i, p in enumerate(self.params):
            grad = p.grad
            self.m[i] = self.betas[0] * self.m[i] + (1 - self.betas[0]) * grad
            self.v[i] = self.betas[1] * self.v[i] + (1 - self.betas[1]) * grad ** 2
            
            m_hat = self.m[i] / (1 - self.betas[0] ** self.t)
            v_hat = self.v[i] / (1 - self.betas[1] ** self.t)
            
            p.data -= self.lr * m_hat / (math.sqrt(v_hat) + self.eps)

def simple_sgd(params, lr=0.01):
    """
    Stochastic Gradient Descent.
    """
    for p in params:
        p.data -= lr * p.grad
