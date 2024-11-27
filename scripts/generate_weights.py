import numpy as np
import struct

def generate_weights():
    # 定义权重形状
    shapes = {
        'dense_1/kernel': (13, 64),
        'dense_1/bias': (64,),
        'dense_2/kernel': (64, 32),
        'dense_2/bias': (32,),
        'dense_3/kernel': (32, 7),
        'dense_3/bias': (7,)
    }
    
    # 生成随机权重并写入二进制文件
    with open('../public/models/audio_event_model.weights.bin', 'wb') as f:
        for shape in shapes.values():
            weights = np.random.normal(0, 0.1, size=shape).astype(np.float32)
            f.write(weights.tobytes())

if __name__ == '__main__':
    generate_weights() 